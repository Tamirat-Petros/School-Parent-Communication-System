export async function createNotifications(models, recipients, notification) {
  const uniqueRecipientIds = [...new Set(recipients.map((recipient) => String(recipient)))];
  if (uniqueRecipientIds.length === 0) return [];

  return models.Notification.insertMany(
    uniqueRecipientIds.map((recipientId) => ({
      ...notification,
      recipientId,
    })),
  );
}

export async function notifyStudentParents(models, student, notification) {
  return createNotifications(models, student.parentIds, notification);
}