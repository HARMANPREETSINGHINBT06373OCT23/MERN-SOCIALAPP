import jwt from "jsonwebtoken";

const socketAuth = (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(" ")[1];

    if (!token) {
      return next(new Error("Authentication error: token missing"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    socket.user = {
      id: decoded.id,
      username: decoded.username
    };

    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
};

export default socketAuth;
