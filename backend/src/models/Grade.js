import mongoose from "mongoose";

const gradeSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    classSectionId: { type: mongoose.Schema.Types.ObjectId, ref: "ClassSection", required: true },
    subject: { type: String, required: true, trim: true, maxlength: 80 },
    assessmentName: { type: String, required: true, trim: true, maxlength: 120 },
    assessmentType: { type: String, enum: ["quiz", "test", "exam", "homework", "project", "other"], default: "other" },
    assessmentDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    score: { type: Number, required: true, min: 0 },
    maxScore: { type: Number, required: true, min: 0.01 },
    remark: { type: String, trim: true, maxlength: 500 },
    enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

gradeSchema.index({ studentId: 1, subject: 1, assessmentName: 1, assessmentDate: 1 }, { unique: true });
gradeSchema.index({ classSectionId: 1, assessmentDate: -1 });

export default mongoose.model("Grade", gradeSchema);