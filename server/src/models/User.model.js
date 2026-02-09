import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    // ✅ display name
    name: {
      type: String,
      default: "",
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true
    },

    // 🔐 security answer / school name
    schoolName: {
      type: String,
      required: true
    },

    avatar: {
      type: String,
      default:
        "https://res.cloudinary.com/demo/image/upload/v1690000000/default-avatar.png"
    },

    bio: {
      type: String,
      maxlength: 150,
      default: "Welcome to my profile 👋"
    },
// Replace the old website line with this in User.model.js
links: [
  {
    title: { type: String, trim: true },
    url: { type: String, trim: true }
  }
],    // 🔒 private account toggle
    isPrivate: {
      type: Boolean,
      default: false
    },

    // ⚙️ INTERACTION & NOTIFICATION SETTINGS
    settings: {
      allowMentionsFrom: {
        type: String,
        enum: ["everyone", "following", "none"],
        default: "everyone"
      },
      muteNotifications: {
        type: Boolean,
        default: false
      }
    },

    // 🚫 blocked users list
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    // 📥 follow requests (private accounts)
    followRequests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    // 👥 social graph
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ]
  },
  { timestamps: true }
);

// 🔍 Search optimization
userSchema.index({ username: "text", name: "text" });

export default mongoose.model("User", userSchema);