import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import {
  acceptFollowRequest,
  rejectFollowRequest,
  cancelFollowRequest
} from "../controllers/followRequest.controller.js";

const router = express.Router();

router.post("/:id/accept", protect, acceptFollowRequest);
router.delete("/:id/reject", protect, rejectFollowRequest);
router.delete("/:id/cancel", protect, cancelFollowRequest); // ✅ NEW

export default router;
