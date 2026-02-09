import Comment from "../models/Comment.model.js";
import Post from "../models/Post.model.js";
import User from "../models/User.model.js";
import Notification from "../models/Notification.model.js";
import { getIO } from "../socket/index.js";

/* ===============================
    🥚 EASTER EGG DETECTOR
   =============================== */
const checkForEasterEggs = (text) => {
  if (text.toLowerCase().includes("up up down down left right left right b a")) {
    return "🎮 KONAMI CODE ACTIVATED! You've unlocked legendary developer status! 🏆";
  }
  
  const easterEggs = {
    "it works on my machine": "🖥️ *Narrator: It didn't work on anyone else's machine*",
    "works on my machine": "🖥️ *Narrator: It didn't work on anyone else's machine*",
    "let's ship it": "🚢 YOLO deployment initiated! What could go wrong? 😅",
    "no bugs only features": "🐛➡️✨ Bug promotion successful! It's a feature now!",
    "trust me bro": "💯 Code review status: APPROVED BY BRO SCIENCE",
    "git push force": "☢️ DANGER ZONE! With great power comes great... merge conflicts",
    "production is fine": "🔥 This is fine meme has entered the chat 🔥",
  };

  const lowerText = text.toLowerCase();
  for (const [trigger, response] of Object.entries(easterEggs)) {
    if (lowerText.includes(trigger)) {
      return response;
    }
  }
  
  return null;
};

/* ===============================
    GET COMMENTS
   =============================== */
export const getPostComments = async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .populate("user", "username avatar")
      .sort({ createdAt: 1 });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ===============================
    CREATE COMMENT / REPLY + MENTIONS
   =============================== */
export const createComment = async (req, res) => {
  try {
    let { text, parentCommentId } = req.body;

    console.log("🔍 DEBUG START ========================");

    // 1. EXTRACT AND VALIDATE MENTIONS (THE HARD BLOCKER)
    let allMentions = text.match(/@([a-zA-Z0-9_]+)/g) || [];
    let allMentionedUsernames = [...new Set(allMentions.map(m => m.slice(1)))];

    if (allMentionedUsernames.length > 0) {
      const mentionedUsers = await User.find({ username: { $in: allMentionedUsernames } });

      for (const targetUser of mentionedUsers) {
        // Skip self-mentions
        if (targetUser._id.toString() === req.userId) continue;

        const privacy = targetUser.settings?.allowMentionsFrom || "everyone";

        // 🔥 BLOCKER RULE: "No one"
        if (privacy === "none") {
          return res.status(403).json({ 
            message: `@${targetUser.username} has disabled mentions.` 
          });
        }

        // 🔥 BLOCKER RULE: "Following"
        if (privacy === "following") {
          const isFollower = targetUser.followers.some(id => id.toString() === req.userId);
          if (!isFollower) {
            return res.status(403).json({ 
              message: `@${targetUser.username} only allows mentions from their followers.` 
            });
          }
        }
      }
    }

    // 🥚 Easter eggs
    const easterEggResponse = checkForEasterEggs(text);
    if (easterEggResponse) {
      text = `${text}\n\n${easterEggResponse}`;
    }

    const post = await Post.findById(req.params.postId).populate("user");
    if (!post) return res.sendStatus(404);

    const me = await User.findById(req.userId);

    // 🔒 PRIVATE ACCOUNT RULE
    if (
      post.user.isPrivate &&
      !post.user._id.equals(me._id) &&
      !post.user.followers.includes(me._id)
    ) {
      return res.status(403).json({ message: "Follow to comment" });
    }

    /* ===============================
        CREATE COMMENT
       =============================== */
    const comment = await Comment.create({
      post: post._id,
      user: req.userId,
      text,
      parent: parentCommentId || null
    });

    const populatedComment = await comment.populate("user", "username avatar");

    /* ===============================
        NOTIFICATIONS LOGIC
       =============================== */
    let parentComment = null;
    let parentUsername = null;
    let manualMentions = [...allMentionedUsernames];

    if (parentCommentId) {
      parentComment = await Comment.findById(parentCommentId).populate("user");
      if (parentComment) {
        parentUsername = parentComment.user.username;
        if (text.trim().startsWith(`@${parentUsername}`)) {
          manualMentions = manualMentions.filter(u => u !== parentUsername);
        }
      }
    }

    const notifiedUserIds = new Set();

    // 🔔 REPLY Notification
    if (parentComment && parentComment.user._id.toString() !== req.userId) {
      if (!manualMentions.includes(parentUsername)) {
        const notification = await Notification.create({
          recipient: parentComment.user._id,
          sender: req.userId,
          type: "reply",
          post: post._id,
          comment: comment._id
        });
        getIO().to(parentComment.user._id.toString()).emit("notification:new", notification);
        notifiedUserIds.add(parentComment.user._id.toString());
      }
    }

    // 🔔 COMMENT Notification
    if (!parentCommentId && post.user._id.toString() !== req.userId) {
      if (!manualMentions.includes(post.user.username)) {
        const notification = await Notification.create({
          recipient: post.user._id,
          sender: req.userId,
          type: "comment",
          post: post._id,
          comment: comment._id
        });
        getIO().to(post.user._id.toString()).emit("notification:new", notification);
        notifiedUserIds.add(post.user._id.toString());
      }
    }

    // 🔔 MENTION Notifications
    if (manualMentions.length > 0) {
      const mentionedUsersForNotify = await User.find({ username: { $in: manualMentions } });
      for (const user of mentionedUsersForNotify) {
        if (user._id.toString() === req.userId || notifiedUserIds.has(user._id.toString())) continue;

        const notification = await Notification.create({
          recipient: user._id,
          sender: req.userId,
          type: "mention",
          post: post._id,
          comment: comment._id
        });
        getIO().to(user._id.toString()).emit("notification:new", notification);
        notifiedUserIds.add(user._id.toString());
      }
    }

    getIO().emit("comment:new", {
      ...populatedComment.toObject(),
      postId: post._id.toString() 
    });

    res.status(201).json(populatedComment);
  } catch (err) {
    console.error("CREATE COMMENT ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

/* ===============================
    DELETE COMMENT
   =============================== */
export const deleteComment = async (req, res) => {
  try {
    const commentId = req.params.id;
    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    await Comment.deleteMany({
      $or: [{ _id: commentId }, { parent: commentId }]
    });

    await Post.findByIdAndUpdate(comment.post, { $pull: { comments: commentId } });
    res.json({ message: "Comment and all nested replies deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ===============================
    EDIT COMMENT
   =============================== */
export const editComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.sendStatus(404);
    if (comment.user.toString() !== req.userId) return res.status(403).json({ message: "Not allowed" });

    comment.text = req.body.text;
    comment.edited = true;
    await comment.save();
    getIO().emit("comment:edit", comment);
    res.json(comment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};