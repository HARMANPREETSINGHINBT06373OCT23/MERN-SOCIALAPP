import Comment from "../models/Comment.model.js";
import Post from "../models/Post.model.js";
import User from "../models/User.model.js";
import Notification from "../models/Notification.model.js";
import { getIO } from "../socket/index.js";

/* ===============================
   GET COMMENTS
   =============================== */
export const getPostComments = async (req, res) => {
  try {
    const comments = await Comment.find({
      post: req.params.postId
    })
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
    const { text, parentCommentId } = req.body;

    const post = await Post.findById(req.params.postId).populate("user");
    if (!post) return res.sendStatus(404);

    const me = await User.findById(req.userId);

    // 🔒 PRIVATE ACCOUNT RULE
    if (
      post.user.isPrivate &&
      !post.user._id.equals(me._id) &&
      !post.user.followers.includes(me._id)
    ) {
      return res
        .status(403)
        .json({ message: "Follow to comment" });
    }

    /* ===============================
       CREATE COMMENT / REPLY
       =============================== */
    const comment = await Comment.create({
      post: post._id,
      user: req.userId,
      text,
      parent: parentCommentId || null
    });

    const populatedComment = await comment.populate(
      "user",
      "username avatar"
    );

    /* ===============================
       NOTIFICATIONS
       =============================== */

    // 1️⃣ REPLY → notify parent comment owner (not self)
    if (parentCommentId) {
      const parentComment = await Comment.findById(parentCommentId);

      if (
        parentComment &&
        parentComment.user.toString() !== req.userId
      ) {
        await Notification.create({
          recipient: parentComment.user,
          sender: req.userId,
          type: "reply",
          post: post._id
        });

        getIO()
          .to(parentComment.user.toString())
          .emit("notification:new");
      }
    }

    // 2️⃣ NORMAL COMMENT → notify post owner (not self)
    if (
      !parentCommentId &&
      post.user._id.toString() !== req.userId
    ) {
      await Notification.create({
        recipient: post.user._id,
        sender: req.userId,
        type: "comment",
        post: post._id
      });

      getIO()
        .to(post.user._id.toString())
        .emit("notification:new");
    }

    // 3️⃣ MENTIONS (@username)
    const mentions = text.match(/@([a-zA-Z0-9_]+)/g) || [];
    const uniqueUsernames = [
      ...new Set(mentions.map(m => m.slice(1)))
    ];

    if (uniqueUsernames.length > 0) {
      const mentionedUsers = await User.find({
        username: { $in: uniqueUsernames }
      });

      for (const user of mentionedUsers) {
        // ❌ no self-mention notification
        if (user._id.toString() === req.userId) continue;

        await Notification.create({
          recipient: user._id,
          sender: req.userId,
          type: "mention",
          post: post._id
        });

        getIO()
          .to(user._id.toString())
          .emit("notification:new");
      }
    }

    /* ===============================
       REAL-TIME COMMENT EVENT
       =============================== */
    getIO().emit("comment:new", populatedComment);

    res.status(201).json(populatedComment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ===============================
   DELETE COMMENT
   =============================== */
export const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (comment.user.toString() !== req.userId) {
      return res.status(403).json({ message: "Not allowed" });
    }

    await comment.deleteOne();

    getIO().emit("comment:delete", {
      commentId: comment._id
    });

    res.json({ success: true });
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

    if (comment.user.toString() !== req.userId) {
      return res.status(403).json({ message: "Not allowed" });
    }

    comment.text = req.body.text;
    comment.edited = true;
    await comment.save();

    getIO().emit("comment:edit", comment);

    res.json(comment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
