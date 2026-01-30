import User from "../models/User.model.js";

/* ================= CHECK USERNAME ================= */
export const checkUsername = async (req, res) => {
  try {
    const { username } = req.params;

    if (!username) {
      return res.status(400).json({
        message: "Username is required"
      });
    }

    const user = await User.findOne({
      username: username.toLowerCase()
    });

    if (user) {
      return res.status(409).json({
        message: "Username already taken"
      });
    }

    return res.status(200).json({
      message: "Username available"
    });
  } catch (err) {
    console.error("CHECK USERNAME ERROR:", err);
    res.status(500).json({
      message: "Server error"
    });
  }
};

/* ================= CHECK EMAIL ================= */
export const checkEmail = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        message: "Email is required"
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase()
    });

    if (user) {
      return res.status(409).json({
        message: "Email already exists"
      });
    }

    return res.status(200).json({
      message: "Email available"
    });
  } catch (err) {
    console.error("CHECK EMAIL ERROR:", err);
    res.status(500).json({
      message: "Server error"
    });
  }
};
