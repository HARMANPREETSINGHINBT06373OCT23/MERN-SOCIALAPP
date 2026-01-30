import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import {
  getMyNotifications,
  markNotificationAsRead,
  deleteNotification
} from "../controllers/notification.controller.js";

const router = express.Router();

/* ===============================
   NOTIFICATION ROUTES
   =============================== */
router.get("/", protect, getMyNotifications);
router.patch("/:id/read", protect, markNotificationAsRead);
router.delete("/:id", protect, deleteNotification);

export default router;
