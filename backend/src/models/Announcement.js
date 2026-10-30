import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    targetScope: { type: String, required: true, enum: ["all", "class", "users"] },
    classSectionId: { type: mongoose.Schema.Types.ObjectId, ref: "ClassSection" },
    targetUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    publishedAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

announcementSchema.index({ publishedAt: -1 });
announcementSchema.index({ classSectionId: 1, publishedAt: -1 });

export default mongoose.model("Announcement", announcementSchema);