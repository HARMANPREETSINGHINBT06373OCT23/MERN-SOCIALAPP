import User from "../models/User.model.js";
import Notification from "../models/Notification.model.js";
import { getIO } from "../socket/index.js";
import { getUserSockets } from "../socket/socketStore.js";

/* ===============================
   ACCEPT FOLLOW REQUEST
   =============================== */
export const acceptFollowRequest = async (req, res) => {
  try {
    const me = await User.findById(req.userId);
    const requester = await User.findById(req.params.id);

    if (!me || !requester) {
      return res.status(404).json({ message: "User not found" });
    }

    /* ---------------------------
       1. REMOVE REQUEST
       --------------------------- */
    me.followRequests = me.followRequests.filter(
      id => !id.equals(requester._id)
    );

    /* ---------------------------
       2. CREATE FOLLOW RELATION
       --------------------------- */
    if (!me.followers.includes(requester._id)) {
      me.followers.push(requester._id);
    }

    if (!requester.following.includes(me._id)) {
      requester.following.push(me._id);
    }

    await me.save();
    await requester.save();

    /* ---------------------------
       3. REMOVE OLD REQUEST NOTIFICATION
       --------------------------- */
    await Notification.deleteOne({
      recipient: me._id,
      sender: requester._id,
      type: "follow_request"
    });

    /* ---------------------------
       4. CREATE ACCEPTED NOTIFICATION
       --------------------------- */
    const notification = await Notification.create({
      recipient: requester._id,
      sender: me._id,
      requester: requester._id,
      type: "follow_accepted"
    });

    const populatedNotification = await notification.populate(
      "sender",
      "username avatar"
    );

    /* ---------------------------
       5. EMIT TO ALL USER SOCKETS
       --------------------------- */
    const io = getIO();
    getUserSockets(requester._id.toString()).forEach(socketId => {
      io.to(socketId).emit("notification:new", populatedNotification);
    });

    return res.json({ message: "Follow request accepted" });
  } catch (err) {
    console.error("Accept follow error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ===============================
   REJECT FOLLOW REQUEST
   =============================== */
export const rejectFollowRequest = async (req, res) => {
  try {
    const me = await User.findById(req.userId);
    const requester = await User.findById(req.params.id);

    if (!me || !requester) {
      return res.status(404).json({ message: "User not found" });
    }

    /* ---------------------------
       1. REMOVE REQUEST
       --------------------------- */
    me.followRequests = me.followRequests.filter(
      id => !id.equals(requester._id)
    );

    await me.save();

    /* ---------------------------
       2. REMOVE OLD REQUEST NOTIFICATION
       --------------------------- */
    await Notification.deleteOne({
      recipient: me._id,
      sender: requester._id,
      type: "follow_request"
    });

    /* ---------------------------
       3. CREATE REJECTED NOTIFICATION
       --------------------------- */
    const notification = await Notification.create({
      recipient: requester._id,
      sender: me._id,
      requester: requester._id,
      type: "follow_rejected"
    });

    const populatedNotification = await notification.populate(
      "sender",
      "username avatar"
    );

    /* ---------------------------
       4. EMIT TO ALL USER SOCKETS
       --------------------------- */
    const io = getIO();
    getUserSockets(requester._id.toString()).forEach(socketId => {
      io.to(socketId).emit("notification:new", populatedNotification);
    });

    return res.json({ message: "Follow request rejected" });
  } catch (err) {
    console.error("Reject follow error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ===============================
   CANCEL FOLLOW REQUEST
   =============================== */
export const cancelFollowRequest = async (req, res) => {
  try {
    const target = await User.findById(req.params.id);

    if (!target) {
      return res.status(404).json({ message: "User not found" });
    }

    /* ---------------------------
       1. REMOVE REQUEST
       --------------------------- */
    target.followRequests = target.followRequests.filter(
      id => id.toString() !== req.userId
    );

    await target.save();

    /* ---------------------------
       2. REMOVE REQUEST NOTIFICATION
       --------------------------- */
    await Notification.deleteOne({
      recipient: target._id,
      sender: req.userId,
      type: "follow_request"
    });

    return res.json({ message: "Follow request cancelled" });
  } catch (err) {
    console.error("Cancel follow error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
