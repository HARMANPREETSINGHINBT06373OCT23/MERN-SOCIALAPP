import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    imageUrl: {
      type: String,
      required: true
    },

    caption: {
      type: String,
      trim: true,
      maxlength: 2200,
      default: ""
    },

    // ✅ Hashtags (non-breaking)
    hashtags: {
      type: [String],
      default: [],
      index: true
    },

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    saves: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    // ✅ COMMENTS (REFERENCE ONLY — SAFE)
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment"
      }
    ]
  },
  { timestamps: true }
);

// ✅ Existing index (unchanged)
postSchema.index({ createdAt: -1 });

// ✅ Hashtag search index (unchanged)
postSchema.index({ hashtags: 1 });

export default mongoose.model("Post", postSchema);
