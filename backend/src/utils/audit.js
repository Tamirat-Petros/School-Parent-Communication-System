export async function writeAuditLog(models, request, entry) {
  try {
    await models.AuditLog.create({
      actorId: request.user?._id,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      ipAddress: request.ip,
      metadata: entry.metadata ?? {},
    });
  } catch (error) {
    // Keep the main request available if the audit collection is unavailable.
    console.error("Could not save audit log:", error.message);
  }
}