import User from "../models/User.model.js";
import { getIO } from "../socket/index.js";

/* ===============================
   GET BLOCKED USERS
   =============================== */
export const getBlockedUsers = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate(
      "blockedUsers",
      "username avatar"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user.blockedUsers);
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
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isPrivate = Boolean(req.body.isPrivate);
    await user.save();

    // 🔔 real-time emit (self only, for UI sync)
    const io = getIO();
    io.to(req.userId.toString()).emit("privacy:updated", {
      isPrivate: user.isPrivate
    });

    res.json({
      message: "Privacy updated",
      isPrivate: user.isPrivate
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
