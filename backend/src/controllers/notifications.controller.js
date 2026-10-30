import { HttpError } from "../utils/http-error.js";

export function createNotificationsController(models) {
  return {
    list: async (request, response) => {
      const query = request.validatedQuery;
      if (query.unreadOnly === "true") filter.readAt = null;
      if (query.before) filter.createdAt = { $lt: new Date(query.before) };

      const notifications = await models.Notification.find(filter)
        .sort({ createdAt: -1 })
        .limit(Number(query.limit ?? 50));
      const nextCursor = notifications.length > 0
        ? notifications[notifications.length - 1].createdAt
        : null;

      return response.json({ notifications, nextCursor });
    },

    unreadCount: async (request, response) => {
      const count = await models.Notification.countDocuments({
        recipientId: request.user._id,
        readAt: null,
      });
      return response.json({ unreadCount: count });
    },

    markRead: async (request, response) => {
      const notification = await models.Notification.findOne({
        _id: request.params.notificationId,
        recipientId: request.user._id,
      });
      if (!notification) {
        throw new HttpError(404, "NOTIFICATION_NOT_FOUND", "Notification was not found.");
      }

      if (!notification.readAt) {
        notification.readAt = new Date();
        await notification.save();
      }

      return response.json({ notification });
    },

    markAllRead: async (request, response) => {
      const result = await models.Notification.updateMany(
        { recipientId: request.user._id, readAt: null },
        { $set: { readAt: new Date() } },
      );
      return response.json({ updatedCount: result.modifiedCount ?? 0 });
    },
  };
}