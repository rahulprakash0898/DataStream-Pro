import app from "../backend/src/app.js";
import { connectDB } from "../backend/src/services/database.service.js";

export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (error) {
    console.error("Vercel DB Connection Error:", error);
  }
  return app(req, res);
}
