import { Server } from "socket.io";
import socketAuth from "./socketAuth.js";
import { addUserSocket, removeUserSocket } from "./socketStore.js";

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176"
      ],
      credentials: true
    }
  });

  io.use(socketAuth);

  io.on("connection", (socket) => {
    const userId = socket.user.id;

    addUserSocket(userId, socket.id);
    console.log(`🟢 Socket connected: ${userId} (${socket.id})`);

    socket.on("disconnect", () => {
      removeUserSocket(userId, socket.id);
      console.log(`🔴 Socket disconnected: ${userId} (${socket.id})`);
    });
  });

  return io;
};

// 👇 allow controllers to emit events
export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};

export default initSocket;
