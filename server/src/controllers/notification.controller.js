import Notification from "../models/Notification.model.js";

/* ===============================
   GET MY NOTIFICATIONS
   =============================== */
export const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipient: req.userId
    })
      .populate("sender", "username avatar")
      .populate("post", "_id")        // ✅ REQUIRED
      .populate("comment", "_id parent") // ✅ REQUIRED
      .sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ===============================
   MARK AS READ
   =============================== */
export const markNotificationAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        recipient: req.userId
      },
      { isRead: true },
      { new: true }
    )
      .populate("sender", "username avatar")
      .populate("post", "_id")
      .populate("comment", "_id parent");

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ===============================
   DELETE NOTIFICATION (PERMANENT)
   =============================== */
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.userId
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ message: "Notification deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
