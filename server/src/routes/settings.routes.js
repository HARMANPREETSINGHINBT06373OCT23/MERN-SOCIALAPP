import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import {
  updatePrivacy,
  getBlockedUsers
} from "../controllers/settings.controller.js";

const router = express.Router();

/* ===============================
   SETTINGS ROUTES
   =============================== */

// ✅ ACCEPT BOTH PUT & PATCH (frontend-safe)
router.put("/privacy", protect, updatePrivacy);
router.patch("/privacy", protect, updatePrivacy);

// 🚫 blocked users
router.get("/blocked-users", protect, getBlockedUsers);

export default router;
