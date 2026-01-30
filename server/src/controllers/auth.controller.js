import User from "../models/User.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

/* ================= COMMON PASSWORD BLOCK ================= */

const commonPasswords = [
  "123456",
  "password",
  "12345678",
  "qwerty",
  "abc123",
  "admin",
  "111111",
  "letmein",
  "welcome"
];

const isWeakPassword = (password) =>
  commonPasswords.includes(password.toLowerCase());

const normalize = (value) => value.trim().toLowerCase();

/* ================= REGISTER ================= */
export const register = async (req, res) => {
  try {
    const { username, email, password, schoolName } = req.body;

    if (!username || !email || !password || !schoolName) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    if (isWeakPassword(password)) {
      return res.status(400).json({
        message:
          "This password is too common. Please choose a stronger one."
      });
    }

    const normalizedUsername = normalize(username);
    const normalizedEmail = normalize(email);
    const normalizedSchoolName = normalize(schoolName);

    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(409).json({
        message: "Email already exists"
      });
    }

    if (await User.findOne({ username: normalizedUsername })) {
      return res.status(409).json({
        message: "Username already taken"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedSchoolName = await bcrypt.hash(
      normalizedSchoolName,
      10
    );

    const user = await User.create({
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashedPassword,
      schoolName: hashedSchoolName
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({
      message: "Server error"
    });
  }
};

/* ================= LOGIN ================= */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    const user = await User.findOne({
      email: normalize(email)
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials"
      });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({
      message: "Server error"
    });
  }
};

/* ================= RESET PASSWORD VIA SECURITY QUESTION ================= */
export const resetPasswordViaSecurity = async (req, res) => {
  try {
    const { identifier, schoolName, password } = req.body;

    if (!identifier || !schoolName || !password) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    if (isWeakPassword(password)) {
      return res.status(400).json({
        message:
          "This password is too common. Please choose a stronger one."
      });
    }

    const user = await User.findOne({
      $or: [
        { email: normalize(identifier) },
        { username: normalize(identifier) }
      ]
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    const normalizedAnswer = normalize(schoolName);
    let answerMatch = false;

    // ✅ Handle BOTH hashed & plain-text schoolName
    if (user.schoolName.startsWith("$2")) {
      // Hashed (new users)
      answerMatch = await bcrypt.compare(
        normalizedAnswer,
        user.schoolName
      );
    } else {
      // Plain text (old users)
      answerMatch =
        normalizedAnswer === normalize(user.schoolName);
    }

    if (!answerMatch) {
      return res.status(400).json({
        message: "Security answer is incorrect"
      });
    }

    // ✅ Update password
    user.password = await bcrypt.hash(password, 10);

    // ✅ Migrate security answer to hashed format
    user.schoolName = await bcrypt.hash(
      normalizedAnswer,
      10
    );

    await user.save();

    res.json({
      message: "Password updated successfully"
    });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    res.status(500).json({
      message: "Server error"
    });
  }
};

/* ================= LOGOUT ================= */
export const logout = async (req, res) => {
  res.status(200).json({
    message: "Logged out successfully"
  });
};
