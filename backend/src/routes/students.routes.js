import { Router } from "express";
import { z } from "zod";
import { createStudentsController } from "../controllers/students.controller.js";
import { createAuthenticate, requireRoles } from "../middleware/authenticate.js";
import { validate } from "../utils/validation.js";

const id = z.string().regex(/^[a-f\d]{24}$/i, "Enter a valid record ID.");
const createSchema = z.object({
  studentNumber: z.string().trim().min(1).max(40),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  gradeLevel: z.string().trim().min(1).max(30),
  classSectionId: id,
  parentIds: z.array(id).min(1).max(4),
}).strict();
const updateSchema = z.object({
  studentNumber: z.string().trim().min(1).max(40).optional(),
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  gradeLevel: z.string().trim().min(1).max(30).optional(),
  classSectionId: id.optional(),
  parentIds: z.array(id).min(1).max(4).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "Provide at least one field.");

export function createStudentsRouter(models, env) {
  const router = Router();
  const authenticate = createAuthenticate(models, env);
  const adminOnly = [authenticate, requireRoles("admin")];
  const controller = createStudentsController(models);

  router.get("/", authenticate, requireRoles("admin", "teacher", "parent"), controller.list);
  router.get("/:studentId", authenticate, requireRoles("admin", "teacher", "parent"), controller.get);
  router.post("/", ...adminOnly, validate(createSchema), controller.create);
  router.patch("/:studentId", ...adminOnly, validate(updateSchema), controller.update);
  router.delete("/:studentId", ...adminOnly, controller.archive);

  return router;
}