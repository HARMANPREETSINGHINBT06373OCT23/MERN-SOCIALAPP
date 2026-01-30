import "./env.js"; // 🔥 MUST be first

import mongoose from "mongoose";
import http from "http";
import app from "./src/app.js";
import initSocket from "./src/socket/index.js";

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");

    // Create HTTP server from Express app
    const server = http.createServer(app);

    // Initialize Socket.IO
    initSocket(server);

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });
