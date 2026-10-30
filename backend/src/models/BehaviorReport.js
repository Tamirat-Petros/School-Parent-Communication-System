import mongoose from "mongoose";

const behaviorReportSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    classSectionId: { type: mongoose.Schema.Types.ObjectId, ref: "ClassSection", required: true },
    reportDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    category: { type: String, required: true, enum: ["positive", "concern"] },
    severity: { type: String, enum: ["low", "medium", "high"], default: "low" },
    description: { type: String, required: true, trim: true, minlength: 3, maxlength: 2000 },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    reviewNote: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

behaviorReportSchema.index({ studentId: 1, createdAt: -1 });
behaviorReportSchema.index({ classSectionId: 1, status: 1, createdAt: -1 });

export default mongoose.model("BehaviorReport", behaviorReportSchema);