import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  age: Number,
  city: String,
  country: String,
  phone: String,
  company: String,
  salary: Number,
  createdAt: { type: Date, default: Date.now }
}, { 
  collection: 'users',
  strict: false
});

export default mongoose.model('User', userSchema);