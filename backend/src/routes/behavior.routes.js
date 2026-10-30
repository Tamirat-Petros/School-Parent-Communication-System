import { Router } from "express";
import { z } from "zod";
import { createBehaviorController } from "../controllers/behavior.controller.js";
import { createAuthenticate, requireRoles } from "../middleware/authenticate.js";
import { validate, validateQuery } from "../utils/validation.js";

const id = z.string().regex(/^[a-f\d]{24}$/i, "Enter a valid record ID.");
const listSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  limit: z.coerce.number().int().min(1).max(250).default(100),
});
const createSchema = z.object({
  studentId: id,
  classSectionId: id,
  category: z.enum(["positive", "concern"]),
  severity: z.enum(["low", "medium", "high"]).default("low"),
  description: z.string().trim().min(3).max(2000),
}).strict();
const reviewSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  reviewNote: z.string().trim().max(500).optional(),
}).strict();

export function createBehaviorRouter(models, env) {
  const router = Router();
  const authenticate = createAuthenticate(models, env);
  const controller = createBehaviorController(models, env);

  router.get(
    "/",
    authenticate,
    requireRoles("admin", "teacher", "parent"),
    validateQuery(listSchema),
    controller.list,
  );
  router.post(
    "/",
    authenticate,
    requireRoles("teacher"),
    validate(createSchema),
    controller.create,
  );
  router.patch(
    "/:reportId/review",
    authenticate,
    requireRoles("admin"),
    validate(reviewSchema),
    controller.review,
  );

  return router;
}