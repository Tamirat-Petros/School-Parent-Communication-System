import mongoose from "mongoose";

export async function connectDatabase(uri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log("Connected to MongoDB.");
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}