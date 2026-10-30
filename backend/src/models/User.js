import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, trim: true, maxlength: 32 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, required: true, enum: ["parent", "teacher", "admin"] },
    isActive: { type: Boolean, default: true, index: true },
    mfaEnabled: { type: Boolean, default: false },
    mfaSecretEncrypted: { type: String, select: false },
    pendingMfaSecretEncrypted: { type: String, select: false },
    passwordChangedAt: { type: Date },
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });

export default mongoose.model("User", userSchema);