import { 
  generateUsersService, 
  downloadUsersService, 
  getHealthStatus 
} from "../services/user.service.js"; // Changed from userService.js to user.service.js
import { getDatabaseStats, clearUsers } from "../services/database.service.js"; // Changed from databaseService.js to database.service.js

export const generateUsers = async (req, res) => {
  const { count = 1000000 } = req.body;
  const downloadId = Date.now().toString();
  
  try {
    // Send immediate response
    res.json({ 
      success: true, 
      downloadId, 
      message: `Started generating ${count.toLocaleString()} users` 
    });

    // Start generation in background with timing
    const startTime = Date.now();
    await generateUsersService(count, downloadId, startTime);
    
  } catch (error) {
    console.error("Error in generateUsers controller:", error);
    // Response already sent, so we can't send another one
  }
};

export const downloadJSON = async (req, res) => {
  const downloadId = Date.now().toString();
  
  try {
    const startTime = Date.now();
    await downloadUsersService(res, downloadId, startTime);
  } catch (error) {
    console.error("Error in downloadJSON controller:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
};

export const getDatabaseStatistics = async (req, res) => {
  try {
    const stats = await getDatabaseStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const clearAllUsers = async (req, res) => {
  try {
    const result = await clearUsers();
    res.json({ 
      success: result.success, 
      message: `Deleted ${result.deletedCount} users` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const healthCheck = async (req, res) => {
  try {
    const health = await getHealthStatus();
    res.json(health);
  } catch (error) {
    res.status(500).json({ status: "Error", error: error.message });
  }
};