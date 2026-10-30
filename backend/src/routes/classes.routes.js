import { Router } from "express";
import { z } from "zod";
import { createClassesController } from "../controllers/classes.controller.js";
import { createAuthenticate, requireRoles } from "../middleware/authenticate.js";
import { validate } from "../utils/validation.js";

const id = z.string().regex(/^[a-f\d]{24}$/i, "Enter a valid record ID.");
const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  gradeLevel: z.string().trim().min(1).max(30),
  academicYear: z.string().trim().min(4).max(20),
  teacherIds: z.array(id).max(20).default([]),
}).strict();
const updateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  gradeLevel: z.string().trim().min(1).max(30).optional(),
  academicYear: z.string().trim().min(4).max(20).optional(),
  teacherIds: z.array(id).max(20).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "Provide at least one field.");

export function createClassesRouter(models, env) {
  const router = Router();
  const authenticate = createAuthenticate(models, env);
  const adminOnly = [authenticate, requireRoles("admin")];
  const controller = createClassesController(models);

  router.get("/", authenticate, requireRoles("admin", "teacher", "parent"), controller.list);
  router.post("/", ...adminOnly, validate(createSchema), controller.create);
  router.patch("/:classId", ...adminOnly, validate(updateSchema), controller.update);

  return router;
}