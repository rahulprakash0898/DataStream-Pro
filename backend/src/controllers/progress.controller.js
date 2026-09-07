import { getProgress } from "../services/progress.service.js";

export const getDownloadProgress = (req, res) => {
  const progress = getProgress(req.params.id);
  res.json(progress);
};