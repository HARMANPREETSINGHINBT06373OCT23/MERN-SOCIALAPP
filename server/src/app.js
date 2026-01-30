import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

// Routes
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import userCheckRoutes from "./routes/userCheck.routes.js";
import postRoutes from "./routes/post.routes.js";
import commentRoutes from "./routes/comment.routes.js"; // ✅ ADD THIS
import notificationRoutes from "./routes/notification.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import followRequestRoutes from "./routes/followRequest.routes.js";

// Middlewares
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();

/* -------------------- MIDDLEWARES -------------------- */
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (Postman, curl, mobile apps)
      if (!origin) return callback(null, true);

      // Allow ALL localhost ports (5173, 5174, 5176, etc.)
      if (origin.startsWith("http://localhost")) {
        return callback(null, true);
      }

      // Block everything else
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);

app.use(express.json());
app.use(cookieParser());

/* -------------------- ROUTES -------------------- */
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/users", userCheckRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes); // ✅ ADD THIS (CRITICAL)
app.use("/api/notifications", notificationRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/follow-requests", followRequestRoutes);

/* -------------------- HEALTH CHECK -------------------- */
app.get("/", (req, res) => {
  res.json({ status: "API is running 🚀" });
});

/* -------------------- ERROR HANDLER -------------------- */
app.use(errorHandler);

export default app;
