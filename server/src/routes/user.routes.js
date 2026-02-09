import express from "express";
import multer from "multer";

import {
  getProfile,
  getUserPosts,
  followUser,
  unfollowUser,
  removeFollower,
  getFollowers,
  getFollowing,
  updateProfile,
  updatePrivacy, // ✅ Added missing import
  updateSettings, // ✅ Added new settings import
  deleteAccount,
  blockUser,
  unblockUser,
  searchUsers,
  getSuggestions
} from "../controllers/user.controller.js";

import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

/* ===============================
   SEARCH & SUGGESTIONS (SPECIFIC)
   =============================== */
router.get("/search/users", protect, searchUsers);
router.get("/suggestions", protect, getSuggestions);

/* ===============================
   POSTS
   =============================== */
router.get("/:username/posts", protect, getUserPosts);

/* ===============================
   FOLLOW LISTS
   =============================== */
router.get("/:username/followers", protect, getFollowers);
router.get("/:username/following", protect, getFollowing);

/* ===============================
   FOLLOW SYSTEM
   =============================== */
router.post("/follow/:id", protect, followUser);
router.post("/unfollow/:id", protect, unfollowUser);
router.post("/removeFollower/:id", protect, removeFollower);

/* ===============================
   BLOCK SYSTEM
   =============================== */
router.post("/block/:id", protect, blockUser);
router.post("/unblock/:id", protect, unblockUser);

/* ===============================
   PROFILE MANAGEMENT (SELF)
   =============================== */
router.patch("/me", protect, upload.single("avatar"), updateProfile);
router.patch("/privacy", protect, updatePrivacy); // ✅ Added privacy route
router.patch("/settings", protect, updateSettings); // ✅ Added interaction settings route
router.delete("/delete", protect, deleteAccount);

/* ===============================
   PROFILE (LAST — LEAST SPECIFIC)
   =============================== */
router.get("/:id", protect, getProfile);

export default router;