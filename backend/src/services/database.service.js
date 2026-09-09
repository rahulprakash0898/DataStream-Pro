import mongoose from "mongoose";
import User from "../models/User.model.js";

let isConnected = false;

export const connectDB = async () => {
  if (isConnected || mongoose.connection.readyState === 1) {
    isConnected = true;
    return;
  }

  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI environment variable is missing in environment settings.");
  }

  try {
    await mongoose.connect(mongoUri, {
      dbName: "testdb",
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    isConnected = true;
    console.log("Connected to MongoDB with Mongoose");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
};

// Export mongoose instance for graceful shutdown if needed
export const getMongooseInstance = () => mongoose;

export const getDatabaseStats = async () => {
  try {
    const totalUsers = await User.estimatedDocumentCount();
    const db = mongoose.connection.db;
    const databaseName = db ? db.databaseName : "Progress-Bar";
    const collections = db ? await db.listCollections().toArray() : [];
    
    return {
      database: databaseName,
      totalUsers: (totalUsers || 0).toLocaleString(),
      collections: collections.map(col => col.name),
      status: mongoose.connection.readyState === 1 ? "connected" : "connecting"
    };
  } catch (error) {
    console.error("Error in getDatabaseStats:", error);
    return {
      database: "Progress-Bar",
      totalUsers: "0",
      collections: [],
      status: "disconnected: " + error.message
    };
  }
};

export const clearUsers = async () => {
  try {
    const result = await User.deleteMany({});
    return { success: true, deletedCount: result.deletedCount };
  } catch (error) {
    throw new Error(error.message);
  }
};