import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true, maxlength: 100 },
    entityType: { type: String, required: true, maxlength: 80 },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    ipAddress: { type: String, maxlength: 64 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export default mongoose.model("AuditLog", auditLogSchema);