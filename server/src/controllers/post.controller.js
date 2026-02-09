import Post from "../models/Post.model.js";
import User from "../models/User.model.js";
import Comment from "../models/Comment.model.js";
import Notification from "../models/Notification.model.js";
import cloudinary from "../utils/cloudinary.js";
import fs from "fs";
import { getIO } from "../socket/index.js";

/* ===============================
   HELPERS
   =============================== */
const getTimeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return interval + "y ago";
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return interval + "mo ago";
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return interval + "d ago";
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return interval + "h ago";
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return interval + "m ago";
  return "just now";
};

/* ===============================
   CREATE POST (MULTIMEDIA + EDITS)
   =============================== */
/* ===============================
   CREATE POST (MULTIMEDIA + EDITS + MENTIONS)
   =============================== */
export const createPost = async (req, res) => {
  try {
    console.log("🚀 STARTING POST CREATION 🚀");
    
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const caption = req.body.caption || "";
    
    // --- 1. MENTION & PERMISSION LOGIC ---
    const mentionedUsernames = caption.match(/@(\w+)/g)?.map(m => m.substring(1)) || [];
    
    if (mentionedUsernames.length > 0) {
      const mentionedUsers = await User.find({ username: { $in: mentionedUsernames } });
      
      for (const targetUser of mentionedUsers) {
        // Accessing your nested schema: settings.allowMentionsFrom
        const permission = targetUser.settings?.allowMentionsFrom || "everyone";

        if (permission === 'none') {
          return res.status(403).json({ 
            message: `@${targetUser.username} has disabled mentioning.` 
          });
        }

        if (permission === 'following') {
          // Check if the recipient (targetUser) follows the sender (req.userId)
          const isFollowing = targetUser.following.some(id => id.toString() === req.userId.toString());
          if (!isFollowing) {
            return res.status(403).json({ 
              message: `@${targetUser.username} only allows mentions from people they follow.` 
            });
          }
        }
      }
    }

    let mediaUrl = "";
    let mediaType = "text";

    // --- 2. MULTIMEDIA HANDLING ---
    if (req.file) {
      const isVideo = req.file.mimetype.startsWith("video");
      
      const uploadOptions = {
        folder: "social_posts",
        resource_type: isVideo ? "video" : "image",
        transformation: [
          { quality: "auto:good", fetch_format: "auto" }
        ]
      };

      const upload = await cloudinary.uploader.upload(req.file.path, uploadOptions);
      mediaUrl = upload.secure_url;
      mediaType = isVideo ? "video" : "image";

      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }

    // --- 3. HASHTAGS ---
    const hashtags = caption.match(/#[a-zA-Z0-9_]+/g)?.map(tag =>
      tag.replace("#", "").toLowerCase()
    ) || [];

    // --- 4. SAVE POST ---
    const post = await Post.create({
      user: req.userId,
      caption,
      imageUrl: mediaUrl, 
      mediaType: mediaType,
      hashtags,
      rotation: parseInt(req.body.rotation) || 0,
      isMuted: req.body.isMuted === "true" || req.body.isMuted === true,
      trimRange: req.body.trimRange ? JSON.parse(req.body.trimRange) : null
    });

    // --- 5. SEND MENTION NOTIFICATIONS ---
    if (mentionedUsernames.length > 0) {
      const mentionedUsers = await User.find({ username: { $in: mentionedUsernames } });
      
      const notificationPromises = mentionedUsers.map(async (targetUser) => {
        // Don't notify yourself
        if (targetUser._id.toString() !== req.userId.toString()) {
          const notif = await Notification.create({
            recipient: targetUser._id,
            sender: req.userId,
            type: "mention", 
            post: post._id,
            content: `mentioned you in a post`
          });
          
          getIO().to(targetUser._id.toString()).emit("notification:new", notif);
        }
      });
      await Promise.all(notificationPromises);
    }

    const populatedPost = await post.populate("user", "username avatar");
    res.status(201).json(populatedPost);

  } catch (err) {
    console.error("🔥 CREATE POST ERROR:", err);
    res.status(500).json({ message: "Failed to create post", error: err.message });
  }
};/* ===============================
   GET FEED (PAGINATED + PRIVACY)
   =============================== */
export const getFeed = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const me = await User.findById(req.userId);
    if (!me) return res.status(404).json({ message: "User not found" });

    const blockedUsers = me.blockedUsers || [];
    const followingIds = me.following || [];

    const publicUsers = await User.find({ 
      isPrivate: false, 
      _id: { $nin: blockedUsers } 
    }).select('_id');
    const publicUserIds = publicUsers.map(u => u._id);

    const feedUserIds = [...new Set([
      req.userId, 
      ...followingIds, 
      ...publicUserIds
    ])];

    const posts = await Post.find({
      user: { $in: feedUserIds, $nin: blockedUsers }
    })
      .populate("user", "username avatar isPrivate followers")
      .sort({ createdAt: -1 }) 
      .skip(skip)
      .limit(limit);

    const formattedPosts = await Promise.all(posts.map(async (p) => {
      if (!p.user) return null; 

      const postObj = p.toObject();
      const totalComments = await Comment.countDocuments({ post: p._id });

      return {
        ...postObj,
        liked: p.likes ? p.likes.some(id => id.toString() === req.userId.toString()) : false,
        likesCount: p.likes ? p.likes.length : 0,
        commentsCount: totalComments, 
        timeAgo: getTimeAgo(p.createdAt),
        user: {
          ...postObj.user,
          avatar: p.user.avatar || `https://ui-avatars.com/api/?name=${p.user.username}`
        }
      };
    }));

    res.json(formattedPosts.filter(p => p !== null));
  } catch (err) {
    console.error("Feed Error:", err);
    res.status(500).json({ message: "Failed to load feed" });
  }
};

/* ===============================
   GET USER POSTS (FIXED FOR DASHBOARD SYNC)
   =============================== */
export const getUserPosts = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ message: "User not found" });

    const me = await User.findById(req.userId);

    // Privacy logic
    if (user.isPrivate && !user._id.equals(me._id) && !user.followers.includes(me._id)) {
      return res.status(403).json({ message: "This account is private" });
    }

    const posts = await Post.find({ user: user._id })
      .populate("user", "username avatar")
      .sort({ createdAt: -1 });

    const formattedPosts = await Promise.all(posts.map(async (p) => {
      // Get exact comment count from the Comment collection
      const totalComments = await Comment.countDocuments({ post: p._id });
      
      const postObj = p.toObject();
      
      return {
        ...postObj,
        // Check if current user liked it
        liked: p.likes ? p.likes.some(id => id.toString() === req.userId.toString()) : false,
        // Explicit numerical counts for the Profile Dashboard overlay
        likesCount: p.likes ? p.likes.length : 0,
        commentsCount: totalComments,
        timeAgo: getTimeAgo(p.createdAt)
      };
    }));

    res.json(formattedPosts);
  } catch (err) {
    console.error("Error in getUserPosts:", err);
    res.status(500).json({ message: "Failed to load posts" });
  }
};

/* ===============================
   LIKE POST (LEGACY)
   =============================== */
export const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const userIdStr = req.userId.toString();
    if (!post.likes.some(id => id.toString() === userIdStr)) {
      post.likes.push(req.userId);
      await post.save();
    }
    // Return both the array length and a specific count property
    res.json({ 
      likes: post.likes.length,
      likesCount: post.likes.length 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ===============================
   SAVE POST
   =============================== */
export const savePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const userIdStr = req.userId.toString();
    if (!post.saves.some(id => id.toString() === userIdStr)) {
      post.saves.push(req.userId);
      await post.save();
    }
    res.json({ saved: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ===============================
   DELETE POST
   =============================== */
export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || post.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }
    await post.deleteOne();
    res.json({ message: "Post deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};/* ===============================
   SEARCH HASHTAGS
   =============================== */
export const searchHashtags = async (req, res) => {
  try {
    const tag = req.query.q?.replace("#", "").trim().toLowerCase();
    if (!tag) return res.json([]);
    const me = await User.findById(req.userId);
    const posts = await Post.find({ hashtags: tag, user: { $nin: me.blockedUsers } })
      .populate("user", "username avatar isPrivate followers")
      .sort({ createdAt: -1 })
      .limit(30);

    const visiblePosts = posts.filter(p => 
      !p.user.isPrivate || p.user._id.equals(me._id) || p.user.followers.includes(me._id)
    );
    res.json(visiblePosts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ===============================
   LIKE / UNLIKE POST (REAL-TIME)
   =============================== */
export const toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate("user");
    if (!post) return res.sendStatus(404);
    const me = await User.findById(req.userId);

    if (post.user.isPrivate && !post.user._id.equals(me._id) && !post.user.followers.includes(me._id)) {
      return res.status(403).json({ message: "Follow to like this post" });
    }

    const userIdStr = req.userId.toString();
    const alreadyLiked = post.likes.some(id => id.toString() === userIdStr);

    if (alreadyLiked) {
      post.likes = post.likes.filter(id => id.toString() !== userIdStr);
    } else {
      post.likes.push(req.userId);
      if (!post.user._id.equals(req.userId)) {
        const notification = await Notification.create({
          recipient: post.user._id, sender: req.userId, type: "like", post: post._id
        });
        getIO().to(post.user._id.toString()).emit("notification:new", notification);
      }
    }
    await post.save();
    getIO().emit("post:like", { postId: post._id, likesCount: post.likes.length, userId: req.userId, liked: !alreadyLiked });
    res.json({ liked: !alreadyLiked, likesCount: post.likes.length, likes: post.likes.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ===============================
   TOGGLE COMMENT BLOCK
   =============================== */
export const toggleCommentBlock = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.sendStatus(404);
    if (post.user.toString() !== req.userId.toString()) return res.status(403).json({ message: "Not allowed" });

    post.commentsBlocked = !post.commentsBlocked;
    await post.save();
    res.json({ commentsBlocked: post.commentsBlocked });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
/* ===============================
   SEARCH GLOBAL (STRICT HASHTAGS + KEYWORDS)
   =============================== */
export const searchGlobal = async (req, res) => {
  try {
    const query = req.query.q || "";
    const me = await User.findById(req.userId);
    if (!me) return res.status(404).json({ message: "User not found" });

    let filter = { user: { $nin: me.blockedUsers } };

    // STRICTURE LOGIC: If query starts with #, search ONLY the hashtags array
    if (query.startsWith("#")) {
      const tag = query.replace("#", "").trim().toLowerCase();
      filter.hashtags = tag;
    } else {
      // BROAD LOGIC: If no #, search caption OR hashtags for the keyword
      filter.$or = [
        { caption: { $regex: query, $options: "i" } },
        { hashtags: { $regex: query, $options: "i" } }
      ];
    }

    const posts = await Post.find(filter)
      .populate("user", "username avatar isPrivate followers")
      .sort({ createdAt: -1 })
      .limit(40);

    // Filter for privacy: Show if public, OR if I am the owner, OR if I follow them
    const visiblePosts = posts.filter(p => {
      if (!p.user) return false;
      return !p.user.isPrivate || 
             p.user._id.equals(me._id) || 
             p.user.followers.some(id => id.toString() === me._id.toString());
    });

    // Format for the frontend UI (Likes, TimeAgo, etc.)
    const formattedPosts = await Promise.all(visiblePosts.map(async (p) => {
      const totalComments = await Comment.countDocuments({ post: p._id });
      return {
        ...p.toObject(),
        liked: p.likes ? p.likes.some(id => id.toString() === req.userId.toString()) : false,
        likesCount: p.likes ? p.likes.length : 0,
        commentsCount: totalComments,
        timeAgo: getTimeAgo(p.createdAt)
      };
    }));

    res.json(formattedPosts);
  } catch (err) {
    console.error("Global Search Error:", err);
    res.status(500).json({ message: "Search failed" });
  }
};