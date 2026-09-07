import mongoose from "mongoose";
import User from "../models/User.model.js";
import { generateRandomUser } from "../utils/fakerGenerator.js";
import { setProgress, deleteProgress } from "./progress.service.js";
import zlib from "zlib";

// Helper function to format time
const formatTime = (milliseconds) => {
  if (!milliseconds) return '0s';
  
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

export const generateUsersService = async (count = 1000000, downloadId, startTime) => {
  try {
    setProgress(downloadId, { 
      processed: 0, 
      total: count, 
      percentage: 0,
      type: 'generating',
      startTime: startTime,
      elapsedTime: 0,
      estimatedTimeRemaining: null
    });

    // Generate users in batches
    const batchSize = 10000;
    let generatedCount = 0;

    while (generatedCount < count) {
      const currentBatchSize = Math.min(batchSize, count - generatedCount);
      const users = [];
      
      for (let i = 0; i < currentBatchSize; i++) {
        users.push(generateRandomUser());
      }

      // Insert batch into database
      await User.insertMany(users);
      generatedCount += currentBatchSize;

      const percentage = Math.round((generatedCount / count) * 100);
      const elapsedTime = Date.now() - startTime;
      const estimatedTimeRemaining = percentage > 0 ? 
        (elapsedTime / percentage) * (100 - percentage) : null;

      setProgress(downloadId, { 
        processed: generatedCount, 
        total: count, 
        percentage,
        type: 'generating',
        startTime: startTime,
        elapsedTime: elapsedTime,
        estimatedTimeRemaining: estimatedTimeRemaining
      });

      console.log(`Generated ${generatedCount.toLocaleString()}/${count.toLocaleString()} users (${percentage}%) - Elapsed: ${formatTime(elapsedTime)}`);
    }

    const totalTime = Date.now() - startTime;
    console.log(`✅ Successfully generated ${count.toLocaleString()} users in ${formatTime(totalTime)}`);
    setProgress(downloadId, { 
      processed: count, 
      total: count, 
      percentage: 100,
      type: 'generating',
      completed: true,
      startTime: startTime,
      elapsedTime: totalTime,
      estimatedTimeRemaining: 0
    });

    return { success: true, generatedCount, totalTime };
  } catch (error) {
    console.error("Error generating users:", error);
    setProgress(downloadId, { 
      error: error.message,
      type: 'generating'
    });
    throw error;
  }
};

export const downloadUsersService = async (res, downloadId, startTime) => {
  try {
    const totalDocs = await User.estimatedDocumentCount();
    
    if (totalDocs === 0) {
      throw new Error("No users found in database. Please generate users first.");
    }

    // Initialize progress
    setProgress(downloadId, { 
      processed: 0, 
      total: totalDocs, 
      percentage: 0,
      type: 'downloading',
      startTime: startTime,
      elapsedTime: 0,
      estimatedTimeRemaining: null
    });

    // Create gzip stream
    const gzip = zlib.createGzip();

    // Secure + compressed headers
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Encoding", "gzip"); 
    res.setHeader("Content-Disposition", 'attachment; filename="users.json.gz"');
    res.setHeader("X-Content-Type-Options", "nosniff");

    // Pipe gzip into response
    gzip.pipe(res);

    return new Promise((resolve, reject) => {
      // Start JSON array
      gzip.write("[");

      let processed = 0;
      let first = true;

      // Using Mongoose cursor for streaming
      const cursor = User.find().cursor({ batchSize: 5000 });

      cursor.on('data', (doc) => {
        if (!first) gzip.write(",");
        
        // Convert Mongoose document to plain object
        const plainDoc = doc.toObject ? doc.toObject() : doc;
        gzip.write(JSON.stringify(plainDoc));
        first = false;

        processed++;
        const percentage = Math.round((processed / totalDocs) * 100);
        const elapsedTime = Date.now() - startTime;
        const estimatedTimeRemaining = percentage > 0 ? 
          (elapsedTime / percentage) * (100 - percentage) : null;
        
        // Update progress
        setProgress(downloadId, { 
          processed, 
          total: totalDocs, 
          percentage,
          type: 'downloading',
          startTime: startTime,
          elapsedTime: elapsedTime,
          estimatedTimeRemaining: estimatedTimeRemaining
        });
        
        if (processed % 5000 === 0) {
          console.log(`Download progress: ${percentage}% (${processed.toLocaleString()}/${totalDocs.toLocaleString()}) - Elapsed: ${formatTime(elapsedTime)}`);
        }
      });

      cursor.on('end', () => {
        gzip.write("]");
        gzip.end();
        const totalTime = Date.now() - startTime;
        console.log(`✅ Compressed JSON download complete in ${formatTime(totalTime)}`);
        deleteProgress(downloadId);
        resolve();
      });

      cursor.on('error', (err) => {
        console.error("Cursor error:", err);
        deleteProgress(downloadId);
        reject(err);
      });

      // Handle gzip errors
      gzip.on('error', (err) => {
        console.error("Gzip error:", err);
        deleteProgress(downloadId);
        reject(err);
      });
    });
  } catch (error) {
    deleteProgress(downloadId);
    throw error;
  }
};

export const getHealthStatus = async () => {
  try {
    let totalUsers = 0;
    try {
      totalUsers = await User.estimatedDocumentCount();
    } catch (e) {
      console.warn("Could not count documents:", e.message);
    }
    
    const dbStatus = mongoose.connection.readyState === 1 ? "Connected" : "Disconnected";
    
    return { 
      status: "OK", 
      database: dbStatus,
      totalUsers: (totalUsers || 0).toLocaleString(),
      mongoose: mongoose.version 
    };
  } catch (error) {
    console.error("Health check error:", error);
    return { status: "Error", error: error.message };
  }
};