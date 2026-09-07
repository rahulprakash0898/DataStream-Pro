import mongoose from "mongoose";
import User from "../models/User.model.js";

let isConnected = false;

export const connectDB = async () => {
  if (isConnected || mongoose.connection.readyState === 1) {
    isConnected = true;
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
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
    const databaseName = mongoose.connection.db.databaseName;
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    return {
      database: databaseName,
      totalUsers: totalUsers.toLocaleString(),
      collections: collections.map(col => col.name),
      status: "connected"
    };
  } catch (error) {
    throw new Error(error.message);
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