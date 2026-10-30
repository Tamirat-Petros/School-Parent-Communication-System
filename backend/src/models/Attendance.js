import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    classSectionId: { type: mongoose.Schema.Types.ObjectId, ref: "ClassSection", required: true },
    schoolDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    status: { type: String, required: true, enum: ["present", "absent", "late", "excused"] },
    note: { type: String, trim: true, maxlength: 300 },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

attendanceSchema.index({ studentId: 1, schoolDate: 1 }, { unique: true });
attendanceSchema.index({ classSectionId: 1, schoolDate: 1, status: 1 });

export default mongoose.model("Attendance", attendanceSchema);