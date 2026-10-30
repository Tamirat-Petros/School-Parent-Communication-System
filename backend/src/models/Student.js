import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    studentNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, required: true, trim: true, maxlength: 80 },
    gradeLevel: { type: String, required: true, trim: true, maxlength: 30 },
    classSectionId: { type: mongoose.Schema.Types.ObjectId, ref: "ClassSection", required: true, index: true },
    parentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

studentSchema.index({ studentNumber: 1 }, { unique: true });
studentSchema.index({ parentIds: 1, isActive: 1 });

export default mongoose.model("Student", studentSchema);