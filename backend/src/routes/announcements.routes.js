import { Router } from "express";
import { z } from "zod";
import { createAnnouncementsController } from "../controllers/announcements.controller.js";
import { createAuthenticate, requireRoles } from "../middleware/authenticate.js";
import { validate } from "../utils/validation.js";

const id = z.string().regex(/^[a-f\d]{24}$/i, "Enter a valid record ID.");
const base = {
  title: z.string().trim().min(1).max(140),
  message: z.string().trim().min(1).max(5000),
};
const createSchema = z.discriminatedUnion("targetScope", [
  z.object({ ...base, targetScope: z.literal("all") }).strict(),
  z.object({ ...base, targetScope: z.literal("class"), classSectionId: id }).strict(),
  z.object({ ...base, targetScope: z.literal("users"), targetUserIds: z.array(id).min(1).max(500) }).strict(),
]);

export function createAnnouncementsRouter(models, env) {
  const router = Router();
  const authenticate = createAuthenticate(models, env);
  const controller = createAnnouncementsController(models);

  router.get("/", authenticate, requireRoles("admin", "teacher", "parent"), controller.list);
  router.post(
    "/",
    authenticate,
    requireRoles("admin"),
    validate(createSchema),
    controller.create,
  );

  return router;
}