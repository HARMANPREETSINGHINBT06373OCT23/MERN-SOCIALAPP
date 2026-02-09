import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // Changed to NOT required to support text-only posts
    // This will store either the Image URL or the Video URL
    imageUrl: {
      type: String,
      default: ""
    },

    caption: {
      type: String,
      trim: true,
      maxlength: 2200,
      default: ""
    },

    // ✅ NEW: Identify if it's "image", "video", or "text"
    mediaType: {
      type: String,
      enum: ["image", "video", "text"],
      default: "image"
    },

    // ✅ NEW: Video/Image Edit Metadata
    rotation: {
      type: Number,
      default: 0
    },

    isMuted: {
      type: Boolean,
      default: false
    },

    // Stores start and end time for video trimming: { start: 0, end: 10 }
    trimRange: {
      type: Object,
      default: null
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
    ],

    // ✅ NEW: Comments Blocked Setting
    commentsBlocked: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// ✅ Existing index (unchanged)
postSchema.index({ createdAt: -1 });

// ✅ Hashtag search index (unchanged)
postSchema.index({ hashtags: 1 });

export default mongoose.model("Post", postSchema);