import express from "express";
import cors from "cors";
import userRoutes from "./routes/user.route.js";
import progressRoutes from "./routes/progress.route.js";

import { connectDB } from "./services/database.service.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Auto-connect DB middleware for serverless/Vercel
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("DB connection middleware failed:", error);
    res.status(500).json({ 
      error: "Database connection failed. Please check MONGO_URI and MongoDB Atlas Network Access.",
      details: error.message 
    });
  }
});

// Routes (Mount at both /api and / for Vercel multi-service support)
app.use("/api", userRoutes);
app.use("/api", progressRoutes);
app.use("/", userRoutes);
app.use("/", progressRoutes);

// Root route
app.get("/", (req, res) => {
  res.json({ 
    message: "DataStram-Pro Backend API is running!",
    endpoints: {
      health: "/api/health",
      generateUsers: "POST /api/generate-users",
      downloadJSON: "GET /api/download-json",
      databaseStats: "GET /api/database-stats",
      progress: "GET /api/download-progress/:id",
      clearUsers: "DELETE /api/clear-users"
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({ error: "Internal server error" });
});

export default app;