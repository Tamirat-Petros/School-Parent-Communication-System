import mongoose from "mongoose";

const classSectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    gradeLevel: { type: String, required: true, trim: true, maxlength: 30 },
    academicYear: { type: String, required: true, trim: true, maxlength: 20 },
    teachers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

classSectionSchema.index({ name: 1, gradeLevel: 1, academicYear: 1 }, { unique: true });

export default mongoose.model("ClassSection", classSectionSchema);