import { HttpError } from "../utils/http-error.js";
import { createNotifications } from "../services/notifications.service.js";
import { writeAuditLog } from "../utils/audit.js";

export function createAnnouncementsController(models) {
  return {
    list: async (request, response) => {
      if (request.user.role === "admin") {
        const announcements = await models.Announcement.find({})
          .sort({ publishedAt: -1 })
          .limit(100);
        return response.json({ announcements });
      }

      let classIds = [];
      if (request.user.role === "teacher") {
        const classes = await models.ClassSection.find({ teachers: request.user._id, isActive: true });
        classIds = classes.map((item) => item._id);
      } else {
        const students = await models.Student.find({ parentIds: request.user._id, isActive: true });
        classIds = [...new Set(students.map((item) => String(item.classSectionId)))];
      }

      const announcements = await models.Announcement.find({
        $or: [
          { targetScope: "all" },
          { targetScope: "class", classSectionId: { $in: classIds } },
          { targetScope: "users", targetUserIds: request.user._id },
        ],
      })
        .sort({ publishedAt: -1 })
        .limit(100);

      return response.json({ announcements });
    },

    create: async (request, response) => {
      let recipients = [];

      if (request.body.targetScope === "all") {
        recipients = await models.User.find({
          role: { $in: ["parent", "teacher"] },
          isActive: true,
        });
      } else if (request.body.targetScope === "class") {
        const classSection = await models.ClassSection.findById(request.body.classSectionId);
        if (!classSection || !classSection.isActive) {
          throw new HttpError(404, "CLASS_NOT_FOUND", "Class was not found.");
        }
        const students = await models.Student.find({ classSectionId: classSection._id, isActive: true });
        const parentIds = [...new Set(students.flatMap((student) => student.parentIds.map(String)))];
        const recipientIds = [...new Set([...parentIds, ...classSection.teachers.map(String)])];
        recipients = await models.User.find({
          _id: { $in: recipientIds },
          role: { $in: ["parent", "teacher"] },
          isActive: true,
        });
      } else {
        const targetIds = [...new Set(request.body.targetUserIds)];
        recipients = await models.User.find({
          _id: { $in: targetIds },
          role: { $in: ["parent", "teacher"] },
          isActive: true,
        });
        if (recipients.length !== targetIds.length) {
          throw new HttpError(400, "INVALID_RECIPIENTS", "Choose active parent or teacher accounts only.");
        }
      }

      const announcement = await models.Announcement.create({
        title: request.body.title,
        message: request.body.message,
        targetScope: request.body.targetScope,
        classSectionId: request.body.classSectionId,
        targetUserIds: request.body.targetUserIds,
        createdBy: request.user._id,
        publishedAt: new Date(),
      });

      const notifications = await createNotifications(models, recipients.map((user) => user._id), {
        actorId: request.user._id,
        kind: "announcement",
        title: announcement.title,
        body: announcement.message.slice(0, 480),
        referenceType: "Announcement",
        referenceId: announcement._id,
      });

      await writeAuditLog(models, request, {
        action: "announcement.published",
        entityType: "Announcement",
        entityId: announcement._id,
        metadata: { recipientCount: recipients.length, targetScope: announcement.targetScope },
      });

      return response.status(201).json({
        announcement,
        notificationCount: notifications.length,
      });
    },
  };
}