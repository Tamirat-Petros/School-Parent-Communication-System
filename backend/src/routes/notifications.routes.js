import { Router } from "express";
import { z } from "zod";
import { createNotificationsController } from "../controllers/notifications.controller.js";
import { createAuthenticate } from "../middleware/authenticate.js";
import { validateQuery } from "../utils/validation.js";

const listSchema = z.object({
  unreadOnly: z.enum(["true", "false"]).optional(),
  before: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export function createNotificationsRouter(models, env) {
  const router = Router();
  const authenticate = createAuthenticate(models, env);
  const controller = createNotificationsController(models);

  router.get("/", authenticate, validateQuery(listSchema), controller.list);
  router.get("/unread-count", authenticate, controller.unreadCount);
  router.patch("/read-all", authenticate, controller.markAllRead);
  router.patch("/:notificationId/read", authenticate, controller.markRead);

  return router;
}