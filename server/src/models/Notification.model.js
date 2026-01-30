import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // ✅ Used for follow accept / reject flows
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    type: {
      type: String,
      enum: [
        "follow",
        "follow_request",
        "follow_accepted",
        "follow_rejected",
        "like",
        "comment",
        "reply",     // ✅ NEW
        "mention"    // ✅ NEW
      ],
      required: true
    },

    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null
    },

    isRead: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
