import jwt from "jsonwebtoken";

export const protect = (req, res, next) => {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized" });
  }

  try {
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id; // 🔥 THIS MUST EXIST
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};
