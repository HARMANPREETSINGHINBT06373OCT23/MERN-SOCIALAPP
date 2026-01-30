import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import {
  getPostComments,
  createComment,
  editComment,
  deleteComment
} from "../controllers/comment.controller.js";

const router = express.Router();

/* ===============================
   GET COMMENTS FOR A POST
   =============================== */
router.get("/:postId", protect, getPostComments);

/* ===============================
   CREATE COMMENT FOR A POST
   =============================== */
router.post("/:postId", protect, createComment);

/* ===============================
   EDIT COMMENT (OWNER ONLY)
   =============================== */
router.put("/:id", protect, editComment);

/* ===============================
   DELETE COMMENT (OWNER ONLY)
   =============================== */
router.delete("/:id", protect, deleteComment);

export default router;
