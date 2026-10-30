import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    lastMessageAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

conversationSchema.index({ studentId: 1, parentId: 1, teacherId: 1 }, { unique: true });

export default mongoose.model("Conversation", conversationSchema);