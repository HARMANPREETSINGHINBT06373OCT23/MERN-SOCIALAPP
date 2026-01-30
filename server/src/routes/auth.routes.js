import express from "express";
import {
  register,
  login,
  logout,
  resetPasswordViaSecurity
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

// 🔐 Forgot password via security question
router.post("/reset-password-security", resetPasswordViaSecurity);

export default router;
