import express from "express";
import { getDownloadProgress } from "../controllers/progress.controller.js";

const router = express.Router();

router.get("/download-progress/:id", getDownloadProgress);

export default router;