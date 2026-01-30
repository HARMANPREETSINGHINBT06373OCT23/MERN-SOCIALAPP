import express from "express";
import {
  checkUsername,
  checkEmail
} from "../controllers/userCheck.controller.js";

const router = express.Router();

router.get("/check-username/:username", checkUsername);
router.get("/check-email/:email", checkEmail);

export default router;
