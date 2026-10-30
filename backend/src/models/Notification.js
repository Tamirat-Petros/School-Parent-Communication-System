import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    kind: {
      type: String,
      required: true,
      enum: ["announcement", "attendance", "grade", "behavior", "message", "system"],
    },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    body: { type: String, required: true, trim: true, maxlength: 500 },
    referenceType: { type: String, enum: ["Announcement", "Attendance", "Grade", "BehaviorReport", "Conversation"] },
    referenceId: { type: mongoose.Schema.Types.ObjectId },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

notificationSchema.index({ recipientId: 1, readAt: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);