import express from "express";
import multer from "multer";

import {
  createPost,
  getFeed,
  getUserPosts,
  searchHashtags,
  likePost,      // existing
  toggleLike,    // ✅ NEW
  savePost,
  deletePost
} from "../controllers/post.controller.js";

import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

/* ======================================================
   ⚠️ VERY IMPORTANT ORDER — DO NOT CHANGE
   ====================================================== */

/* ===============================
   SEARCH (MOST SPECIFIC)
   =============================== */
router.get("/search/hashtags", protect, searchHashtags);

/* ===============================
   FEED
   =============================== */
router.get("/feed", protect, getFeed);

/* ===============================
   USER POSTS
   =============================== */
router.get("/:username/posts", protect, getUserPosts);

/* ===============================
   CREATE POST
   =============================== */
router.post("/", protect, upload.single("image"), createPost);

/* ===============================
   POST ACTIONS
   =============================== */

/* ✅ OLD LIKE ROUTE (KEEP — NON-BREAKING) */
router.post("/like/:id", protect, likePost);

/* ✅ NEW REST-STYLE TOGGLE LIKE ROUTE */
router.post("/:id/like", protect, toggleLike);

router.post("/save/:id", protect, savePost);
router.delete("/:id", protect, deletePost);

export default router;
