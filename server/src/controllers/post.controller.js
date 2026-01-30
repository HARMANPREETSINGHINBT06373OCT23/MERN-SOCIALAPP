import Post from "../models/Post.model.js";
import User from "../models/User.model.js";
import Notification from "../models/Notification.model.js";
import cloudinary from "../utils/cloudinary.js";
import fs from "fs";
import { getIO } from "../socket/index.js";

/* ===============================
   CREATE POST (WITH HASHTAGS)
   =============================== */
export const createPost = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image is required" });
    }

    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const upload = await cloudinary.uploader.upload(req.file.path, {
      folder: "social_posts"
    });

    fs.unlinkSync(req.file.path);

    const caption = req.body.caption || "";

    const hashtags =
      caption.match(/#[a-zA-Z0-9_]+/g)?.map(tag =>
        tag.replace("#", "").toLowerCase()
      ) || [];

    const post = await Post.create({
      user: req.userId,
      caption,
      imageUrl: upload.secure_url,
      hashtags
    });

    const populatedPost = await post.populate(
      "user",
      "username avatar"
    );

    res.status(201).json(populatedPost);
  } catch (err) {
    console.error("CREATE POST ERROR:", err);
    res.status(500).json({ message: "Failed to create post" });
  }
};

/* ===============================
   GET FEED (PAGINATED + PRIVACY)
   =============================== */
export const getFeed = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const me = await User.findById(req.userId);

    const posts = await Post.find({
      user: { $nin: me?.blockedUsers || [] }
    })
      .populate("user", "username avatar isPrivate followers")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const visiblePosts = posts.filter(
      p =>
        !p.user.isPrivate ||
        p.user._id.equals(me._id) ||
        p.user.followers.includes(me._id)
    );

    // 🔥 ADD liked FLAG (FIX)
    const formattedPosts = visiblePosts.map(p => ({
      ...p.toObject(),
      liked: p.likes.includes(req.userId)
    }));

    res.json(formattedPosts);
  } catch (err) {
    res.status(500).json({ message: "Failed to load feed" });
  }
};
/* ===============================
   GET USER POSTS
   =============================== */
export const getUserPosts = async (req, res) => {
  try {
    const user = await User.findOne({
      username: req.params.username
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const me = await User.findById(req.userId);

    if (
      user.isPrivate &&
      !user._id.equals(me._id) &&
      !user.followers.includes(me._id)
    ) {
      return res
        .status(403)
        .json({ message: "This account is private" });
    }

    const posts = await Post.find({ user: user._id })
      .populate("user", "username avatar")
      .sort({ createdAt: -1 });

    // 🔥 ADD liked FLAG (FIX)
    const formattedPosts = posts.map(p => ({
      ...p.toObject(),
      liked: p.likes.includes(req.userId)
    }));

    res.json(formattedPosts);
  } catch (err) {
    res.status(500).json({ message: "Failed to load posts" });
  }
};

/* ===============================
   LIKE POST (LEGACY — KEEP)
   =============================== */
export const likePost = async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  if (!post.likes.includes(req.userId)) {
    post.likes.push(req.userId);
    await post.save();
  }

  res.json({ likes: post.likes.length });
};

/* ===============================
   SAVE POST
   =============================== */
export const savePost = async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  if (!post.saves.includes(req.userId)) {
    post.saves.push(req.userId);
    await post.save();
  }

  res.json({ saved: true });
};

/* ===============================
   DELETE POST
   =============================== */
export const deletePost = async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post || post.user.toString() !== req.userId) {
    return res.status(403).json({ message: "Not allowed" });
  }

  await post.deleteOne();
  res.json({ message: "Post deleted" });
};

/* ===============================
   SEARCH HASHTAGS
   =============================== */
export const searchHashtags = async (req, res) => {
  try {
    const tag = req.query.q?.replace("#", "").trim().toLowerCase();
    if (!tag) return res.json([]);

    const me = await User.findById(req.userId);

    const posts = await Post.find({
      hashtags: tag,
      user: { $nin: me.blockedUsers }
    })
      .populate("user", "username avatar isPrivate followers")
      .sort({ createdAt: -1 })
      .limit(30);

    const visiblePosts = posts.filter(
      p =>
        !p.user.isPrivate ||
        p.user._id.equals(me._id) ||
        p.user.followers.includes(me._id)
    );

    res.json(visiblePosts);
  } catch (err) {
    console.error("HASHTAG SEARCH ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

/* ===============================
   LIKE / UNLIKE POST
   (REAL-TIME + PRIVATE CHECK)
   =============================== */
export const toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate("user");
    if (!post) return res.sendStatus(404);

    const me = await User.findById(req.userId);

    // 🔒 PRIVATE ACCOUNT PERMISSION
    if (
      post.user.isPrivate &&
      !post.user._id.equals(me._id) &&
      !post.user.followers.includes(me._id)
    ) {
      return res
        .status(403)
        .json({ message: "Follow to like this post" });
    }

    const alreadyLiked = post.likes.includes(req.userId);

    if (alreadyLiked) {
      post.likes.pull(req.userId);
    } else {
      post.likes.push(req.userId);

      // 🔔 NOTIFY (NO SELF)
if (!post.user._id.equals(req.userId)) {
  const notification = await Notification.create({
    recipient: post.user._id,
    sender: req.userId,
    type: "like",
    post: post._id
  });

  getIO()
    .to(post.user._id.toString())
    .emit("notification:new", notification);
}
    }

    await post.save();

    // 🔥 REAL-TIME UPDATE (GLOBAL)
    getIO().emit("post:like", {
      postId: post._id,
      likes: post.likes.length,
      userId: req.userId,
      liked: !alreadyLiked
    });

    res.json({
      liked: !alreadyLiked,
      likes: post.likes.length
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
