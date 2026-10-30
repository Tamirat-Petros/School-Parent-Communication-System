import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../src/models/User.js";
import { connectDatabase } from "../src/config/database.js";

const { BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_PASSWORD, MONGODB_URI } = process.env;

if (!BOOTSTRAP_ADMIN_EMAIL || !BOOTSTRAP_ADMIN_NAME || !BOOTSTRAP_ADMIN_PASSWORD) {
  throw new Error("Set BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_NAME, and BOOTSTRAP_ADMIN_PASSWORD first.");
}

if (BOOTSTRAP_ADMIN_PASSWORD.length < 12) {
  throw new Error("BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters.");
}

try {
  await connectDatabase(MONGODB_URI);
  const email = BOOTSTRAP_ADMIN_EMAIL.trim().toLowerCase();
  const existingAdmin = await User.findOne({ email });

  if (existingAdmin) {
    throw new Error("An account with that email already exists.");
  }

  const passwordHash = await bcrypt.hash(BOOTSTRAP_ADMIN_PASSWORD, 12);
  await User.create({
    name: BOOTSTRAP_ADMIN_NAME.trim(),
    email,
    passwordHash,
    role: "admin",
    isActive: true,
    mfaEnabled: false,
  });

  console.log("Administrator account created. Sign in to enroll an authenticator app.");
} finally {
  await mongoose.disconnect();
}