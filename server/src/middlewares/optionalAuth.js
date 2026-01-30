import jwt from "jsonwebtoken";

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Guest user → allow access
  if (!authHeader) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // logged-in user
  } catch (error) {
    // Invalid/expired token → treat as guest
    req.user = null;
  }

  next();
};

export default optionalAuth;
