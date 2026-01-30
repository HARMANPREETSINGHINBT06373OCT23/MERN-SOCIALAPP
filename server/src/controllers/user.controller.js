import mongoose from "mongoose";
import User from "../models/User.model.js";
import Post from "../models/Post.model.js";
import Notification from "../models/Notification.model.js";
import cloudinary from "../utils/cloudinary.js";
import fs from "fs";
import { getIO } from "../socket/index.js";
import { getUserSockets } from "../socket/socketStore.js";

const DEFAULT_AVATAR =
  "https://res.cloudinary.com/demo/image/upload/v1690000000/default-avatar.png";

/* ===============================
   HELPERS
   =============================== */
const isBlockedEitherWay = (me, target) => {
  if (!me || !target) return false;
  return (
    me.blockedUsers.includes(target._id) ||
    target.blockedUsers.includes(me._id)
  );
};

/* ===============================
   PROFILE (ID OR USERNAME)
   =============================== */
export const getProfile = async (req, res) => {
  try {
    const param = req.params.id;

    const user = mongoose.isValidObjectId(param)
      ? await User.findById(param)
      : await User.findOne({ username: param });

    if (!user) return res.status(404).json({ message: "User not found" });

    const me = req.userId ? await User.findById(req.userId) : null;

    if (me && isBlockedEitherWay(me, user)) {
      return res.status(404).json({ message: "User not found" });
    }

    const isOwner = me && user._id.equals(me._id);
    const isFollower =
      me && user.followers.some(id => id.equals(me._id));

    const hasRequestedFollow =
      user.isPrivate &&
      me &&
      user.followRequests.includes(me._id);

    const isLocked = user.isPrivate && !isOwner && !isFollower;
    const postsCount = await Post.countDocuments({ user: user._id });

    res.json({
      _id: user._id,
      username: user.username,
      name: user.name,
      avatar: user.avatar,
      bio: user.bio,
      isPrivate: user.isPrivate,
      isLocked,
      isFollowing: !!isFollower,
      hasRequestedFollow,
      followersCount: isLocked ? null : user.followers.length,
      followingCount: isLocked ? null : user.following.length,
      postsCount: isLocked ? null : postsCount
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/* ===============================
   PROFILE POSTS GRID
   =============================== */
export const getUserPosts = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ message: "User not found" });

    const me = req.userId ? await User.findById(req.userId) : null;

    if (me && isBlockedEitherWay(me, user)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const isOwner = me && user._id.equals(me._id);
    const isFollower =
      me && user.followers.some(id => id.equals(me._id));

    if (user.isPrivate && !isOwner && !isFollower) {
      return res
        .status(403)
        .json({ message: "This account is private" });
    }

    const posts = await Post.find({ user: user._id })
      .populate("user", "username avatar")
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/* ===============================
   FOLLOWERS LIST (ADDED)
   =============================== */
export const getFollowers = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .populate("followers", "username avatar");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const me = req.userId ? await User.findById(req.userId) : null;

    if (me && isBlockedEitherWay(me, user)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const isOwner = me && user._id.equals(me._id);
    const isFollower =
      me && user.followers.some(id => id.equals(me._id));

    if (user.isPrivate && !isOwner && !isFollower) {
      return res
        .status(403)
        .json({ message: "This account is private" });
    }

    // ✅ ENRICH FOLLOWERS WITH RELATIONSHIP INFO
    const followers = user.followers.map(follower => ({
      _id: follower._id,
      username: follower.username,
      avatar: follower.avatar,

      // 🔥 IMPORTANT FLAGS
      isMe: me ? follower._id.equals(me._id) : false,
      isFollowing: me
        ? me.following.some(id => id.equals(follower._id))
        : false
    }));

    res.json(followers);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/* ===============================
   FOLLOWING LIST (ADDED)
   =============================== */
export const getFollowing = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .populate("following", "username avatar");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const me = req.userId ? await User.findById(req.userId) : null;

    if (me && isBlockedEitherWay(me, user)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const isOwner = me && user._id.equals(me._id);
    const isFollower =
      me && user.followers.some(id => id.equals(me._id));

    if (user.isPrivate && !isOwner && !isFollower) {
      return res
        .status(403)
        .json({ message: "This account is private" });
    }

    // ✅ ENRICH FOLLOWING WITH RELATIONSHIP INFO
    const following = user.following.map(followedUser => ({
      _id: followedUser._id,
      username: followedUser.username,
      avatar: followedUser.avatar,

      // 🔥 IMPORTANT FLAGS
      isMe: me ? followedUser._id.equals(me._id) : false,

      // You are ALWAYS following users in your "following" list
      isFollowing: me
        ? me.following.some(id => id.equals(followedUser._id))
        : false
    }));

    res.json(following);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/* ===============================
   FOLLOW USER
   =============================== */
export const followUser = async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    const me = await User.findById(req.userId);

    if (!target || !me)
      return res.status(404).json({ message: "User not found" });

    if (isBlockedEitherWay(me, target)) {
      return res.status(403).json({ message: "Action not allowed" });
    }

    if (target._id.equals(me._id))
      return res.status(400).json({ message: "Cannot follow yourself" });

    if (target.isPrivate) {
      if (
        target.followRequests.includes(me._id) ||
        target.followers.includes(me._id)
      ) {
        return res
          .status(400)
          .json({ message: "Request already sent" });
      }

      target.followRequests.push(me._id);
      await target.save();

      const notification = await Notification.create({
        recipient: target._id,
        sender: me._id,
        type: "follow_request"
      });

      const io = getIO();
      const sockets = getUserSockets(target._id.toString());
      sockets.forEach(socketId => {
        io.to(socketId).emit("notification:new", notification);
      });

      return res.json({ message: "Follow request sent" });
    }

    if (me.following.includes(target._id)) {
      return res
        .status(400)
        .json({ message: "Already following" });
    }

    target.followRequests = target.followRequests.filter(
      id => !id.equals(me._id)
    );

    me.following.push(target._id);
    target.followers.push(me._id);

    await me.save();
    await target.save();

    const notification = await Notification.create({
      recipient: target._id,
      sender: me._id,
      type: "follow"
    });

    const io = getIO();
    const sockets = getUserSockets(target._id.toString());
    sockets.forEach(socketId => {
      io.to(socketId).emit("notification:new", {
        _id: notification._id,
        type: "follow",
        sender: {
          _id: me._id,
          username: me.username,
          avatar: me.avatar
        },
        createdAt: notification.createdAt
      });
    });

    res.json({ message: "User followed successfully" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/* ===============================
   UNFOLLOW USER
   =============================== */
export const unfollowUser = async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    const me = await User.findById(req.userId);

    if (!target || !me)
      return res.status(404).json({ message: "User not found" });

    me.following = me.following.filter(
      id => !id.equals(target._id)
    );
    target.followers = target.followers.filter(
      id => !id.equals(me._id)
    );

    await me.save();
    await target.save();

    res.json({ message: "User unfollowed successfully" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/* ===============================
   BLOCK USER
   =============================== */
export const blockUser = async (req, res) => {
  try {
    const me = await User.findById(req.userId);
    const target = await User.findById(req.params.id);

    if (!me || !target)
      return res.status(404).json({ message: "User not found" });

    if (me._id.equals(target._id))
      return res.status(400).json({ message: "Cannot block yourself" });

    if (me.blockedUsers.includes(target._id)) {
      return res.status(400).json({ message: "Already blocked" });
    }

    me.following = me.following.filter(id => !id.equals(target._id));
    me.followers = me.followers.filter(id => !id.equals(target._id));
    target.following = target.following.filter(id => !id.equals(me._id));
    target.followers = target.followers.filter(id => !id.equals(me._id));

    me.followRequests = me.followRequests.filter(
      id => !id.equals(target._id)
    );
    target.followRequests = target.followRequests.filter(
      id => !id.equals(me._id)
    );

    me.blockedUsers.push(target._id);

    await Notification.deleteMany({
      $or: [
        { sender: me._id, recipient: target._id },
        { sender: target._id, recipient: me._id }
      ]
    });

    await me.save();
    await target.save();

    res.json({ message: "User blocked successfully" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/* ===============================
   UNBLOCK USER
   =============================== */
export const unblockUser = async (req, res) => {
  try {
    const me = await User.findById(req.userId);
    if (!me) return res.status(404).json({ message: "User not found" });

    me.blockedUsers = me.blockedUsers.filter(
      id => id.toString() !== req.params.id
    );

    await me.save();

    res.json({ message: "User unblocked successfully" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/* ===============================
   UPDATE PROFILE
   =============================== */
export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (req.body.name !== undefined) user.name = req.body.name;
    if (req.body.bio !== undefined) user.bio = req.body.bio;

    if (req.body.avatar === "REMOVE") {
      user.avatar = DEFAULT_AVATAR;
    }

    if (req.file) {
      const upload = await cloudinary.uploader.upload(req.file.path, {
        folder: "avatars"
      });
      user.avatar = upload.secure_url;
      fs.unlinkSync(req.file.path);
    }

    await user.save();

    const safeUser = user.toObject();
    delete safeUser.password;
    delete safeUser.schoolName;

    res.json(safeUser);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/* ===============================
   UPDATE ACCOUNT PRIVACY
   =============================== */
export const updatePrivacy = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const wasPrivate = user.isPrivate;
    user.isPrivate = !!req.body.isPrivate;

    if (wasPrivate && !user.isPrivate && user.followRequests.length) {
      user.followRequests.forEach(id => {
        if (!user.followers.includes(id)) {
          user.followers.push(id);
        }
      });
      user.followRequests = [];
    }

    await user.save();

    res.json({
      message: "Privacy updated successfully",
      isPrivate: user.isPrivate
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const removeFollower = async (req, res) => {
  try {
    const myId = req.userId;
    const followerId = req.params.id;

    if (myId === followerId) {
      return res.status(400).json({ message: "Invalid action" });
    }

    // 1️⃣ Remove them from MY followers
    await User.findByIdAndUpdate(myId, {
      $pull: { followers: followerId }
    });

    // 2️⃣ Remove ME from THEIR following
    await User.findByIdAndUpdate(followerId, {
      $pull: { following: myId }
    });

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to remove follower" });
  }
};

/* ===============================
   DELETE ACCOUNT
   =============================== */
export const deleteAccount = async (req, res) => {
  try {
    const { schoolName } = req.body;

    const user = await User.findById(req.userId);
    if (!user || user.schoolName !== schoolName) {
      return res.status(401).json({ message: "Security answer incorrect" });
    }

    await Post.deleteMany({ user: user._id });
    await user.deleteOne();

    res.clearCookie("refreshToken");
    res.json({ message: "Account deleted successfully" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
/* ===============================
   SEARCH USERS (USERNAME)
   =============================== */
export const searchUsers = async (req, res) => {
  try {
    const q = req.query.q?.trim();
    if (!q) return res.json([]);

    const me = await User.findById(req.userId);

    const users = await User.find({
      username: { $regex: q, $options: "i" },
      _id: {
        $nin: [
          ...me.blockedUsers,
          me._id
        ]
      }
    })
      .limit(20)
      .select("username avatar");

    res.json(users);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
