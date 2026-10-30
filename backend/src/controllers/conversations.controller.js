import { assertClassAccess } from "../services/authorization.service.js";
import { createNotifications } from "../services/notifications.service.js";
import { HttpError } from "../utils/http-error.js";
import { writeAuditLog } from "../utils/audit.js";

async function findConversation(user, conversationId, models) {
  const conversation = await models.Conversation.findOne({
    _id: conversationId,
    $or: [{ parentId: user._id }, { teacherId: user._id }],
  });
  if (!conversation) {
    throw new HttpError(404, "CONVERSATION_NOT_FOUND", "Conversation was not found.");
  }
  return conversation;
}

export function createConversationsController(models) {
  return {
    list: async (request, response) => {
      const userId = request.user._id;
      const conversations = await models.Conversation.find({
        $or: [{ parentId: userId }, { teacherId: userId }],
      })
        .sort({ lastMessageAt: -1 })
        .limit(100)
        .populate("studentId", "firstName lastName studentNumber")
        .populate("parentId", "name email")
        .populate("teacherId", "name email");
      return response.json({ conversations });
    },

    create: async (request, response) => {
      const student = await models.Student.findById(request.body.studentId);
      if (!student || !student.isActive) {
        throw new HttpError(404, "STUDENT_NOT_FOUND", "Student record was not found.");
      }
      const classSection = await models.ClassSection.findById(student.classSectionId);
      if (!classSection || !classSection.isActive) {
        throw new HttpError(404, "CLASS_NOT_FOUND", "Student's class was not found.");
      }

      let parentId;
      let teacherId;
      if (request.user.role === "parent") {
        if (!student.parentIds.some((id) => String(id) === String(request.user._id))) {
          throw new HttpError(403, "STUDENT_ACCESS_DENIED", "You cannot start a conversation about this student.");
        }
        parentId = request.user._id;
        teacherId = request.body.recipientId;
        if (!classSection.teachers.some((id) => String(id) === String(teacherId))) {
          throw new HttpError(400, "TEACHER_NOT_ASSIGNED", "Choose a teacher assigned to this student's class.");
        }
      } else {
        await assertClassAccess(request.user, classSection._id, models);
        teacherId = request.user._id;
        parentId = request.body.recipientId;
        if (!student.parentIds.some((id) => String(id) === String(parentId))) {
          throw new HttpError(400, "PARENT_NOT_LINKED", "Choose a parent linked to this student.");
        }
      }

      const recipient = await models.User.findOne({
        _id: request.body.recipientId,
        isActive: true,
        role: request.user.role === "parent" ? "teacher" : "parent",
      });
      if (!recipient) throw new HttpError(400, "INVALID_RECIPIENT", "The selected recipient is unavailable.");

      let conversation = await models.Conversation.findOneAndUpdate(
        { studentId: student._id, parentId, teacherId },
        { $setOnInsert: { studentId: student._id, parentId, teacherId, lastMessageAt: new Date() } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      await writeAuditLog(models, request, {
        action: "conversation.opened",
        entityType: "Conversation",
        entityId: conversation._id,
      });

      return response.status(200).json({ conversation });
    },

    messages: async (request, response) => {
      const conversation = await findConversation(request.user, request.params.conversationId, models);
      if (query.before) {
        await models.Message.updateMany(
          {
            conversationId: conversation._id,
            recipientId: request.user._id,
            readAt: null,
            createdAt: { $lt: new Date(query.before) },
          },
          { $set: { readAt: new Date() } },
        );
      } else {
        await models.Message.updateMany(
          { conversationId: conversation._id, recipientId: request.user._id, readAt: null },
          { $set: { readAt: new Date() } },
        );
      }

      const filter = { conversationId: conversation._id };
      if (query.before) filter.createdAt = { $lt: new Date(query.before) };
      const messages = await models.Message.find(filter)
        .sort({ createdAt: -1 })
        .limit(Number(query.limit ?? 50));
      messages.reverse();

      return response.json({
        messages,
        nextCursor: messages[0]?.createdAt ?? null,
      });
    },

    sendMessage: async (request, response) => {
      const conversation = await findConversation(request.user, request.params.conversationId, models);
      const recipientId = String(conversation.parentId) === String(request.user._id)
        ? conversation.teacherId
        : conversation.parentId;

      const message = await models.Message.create({
        conversationId: conversation._id,
        senderId: request.user._id,
        recipientId,
        body: request.body.body,
      });
      conversation.lastMessageAt = message.createdAt ?? new Date();
      await conversation.save();

      await createNotifications(models, [recipientId], {
        actorId: request.user._id,
        kind: "message",
        title: "New school message",
        body: "You have a new message in the parent-teacher inbox.",
        referenceType: "Conversation",
        referenceId: conversation._id,
      });

      await writeAuditLog(models, request, {
        action: "message.sent",
        entityType: "Conversation",
        entityId: conversation._id,
      });

      return response.status(201).json({ message });
    },
  };
}