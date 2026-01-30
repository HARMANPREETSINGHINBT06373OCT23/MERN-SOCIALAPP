import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true
    },

    // ✅ FOR REPLIES
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null
    },

    // ✅ NEW: TRACK EDITED COMMENTS
    edited: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

export default mongoose.model("Comment", commentSchema);
