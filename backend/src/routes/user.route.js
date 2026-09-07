import express from "express";
import {
  generateUsers,
  downloadJSON,
  getDatabaseStatistics,
  clearAllUsers,
  healthCheck
} from "../controllers/user.controller.js";

const router = express.Router();

router.post("/generate-users", generateUsers);
router.get("/download-json", downloadJSON);
router.get("/database-stats", getDatabaseStatistics);
router.delete("/clear-users", clearAllUsers);
router.get("/health", healthCheck);

export default router;
