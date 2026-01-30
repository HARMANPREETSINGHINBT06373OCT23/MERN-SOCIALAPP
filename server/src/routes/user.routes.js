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
  deleteAccount,
  blockUser,
  unblockUser,
  searchUsers
} from "../controllers/user.controller.js";


import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

/* ======================================================
   ⚠️ VERY IMPORTANT ORDER — DO NOT CHANGE
   ====================================================== */

/* ===============================
   SEARCH (MOST SPECIFIC)
   =============================== */
router.get("/search/users", protect, searchUsers);

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
router.delete("/delete", protect, deleteAccount);

/* ===============================
   PROFILE (LAST — LEAST SPECIFIC)
   =============================== */
/*
  ⚠️ This MUST be last, otherwise it will
  capture /search, /followers, /following, etc.
*/
router.get("/:id", protect, getProfile);

export default router;
