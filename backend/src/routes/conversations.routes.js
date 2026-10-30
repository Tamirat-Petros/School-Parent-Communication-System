import { Router } from "express";
import { z } from "zod";
import { createConversationsController } from "../controllers/conversations.controller.js";
import { createAuthenticate, requireRoles } from "../middleware/authenticate.js";
import { validate, validateQuery } from "../utils/validation.js";

const id = z.string().regex(/^[a-f\d]{24}$/i, "Enter a valid record ID.");
const createSchema = z.object({
  studentId: id,
  recipientId: id,
}).strict();
const messageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
}).strict();
const messagesQuery = z.object({
  before: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export function createConversationsRouter(models, env) {
  const router = Router();
  const authenticate = createAuthenticate(models, env);
  const parentOrTeacher = requireRoles("parent", "teacher");
  const controller = createConversationsController(models);

  router.get("/", authenticate, parentOrTeacher, controller.list);
  router.post("/", authenticate, parentOrTeacher, validate(createSchema), controller.create);
  router.get(
    "/:conversationId/messages",
    authenticate,
    parentOrTeacher,
    validateQuery(messagesQuery),
    controller.messages,
  );
  router.post(
    "/:conversationId/messages",
    authenticate,
    parentOrTeacher,
    validate(messageSchema),
    controller.sendMessage,
  );

  return router;
}