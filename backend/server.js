import dotenv from "dotenv";
import { connectDB } from "./src/services/database.service.js";
import app from "./src/app.js";

dotenv.config();

const PORT = process.env.PORT || 3000;

// Connect DB if MONGO_URI is set
if (process.env.MONGO_URI) {
  connectDB().catch((err) => {
    console.error("Failed to connect MongoDB on server startup:", err.message);
  });
}

// Only listen when running standalone locally (Vercel manages port dynamically)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📈 Database stats: http://localhost:${PORT}/api/database-stats`);
  });
}

// Export Express app for Vercel Serverless Function handler
export default app;