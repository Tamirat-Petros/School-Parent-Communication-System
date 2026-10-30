import { Router } from "express";
import { z } from "zod";
import { createAttendanceController } from "../controllers/attendance.controller.js";
import { createAuthenticate, requireRoles } from "../middleware/authenticate.js";
import { validate, validateQuery } from "../utils/validation.js";
import { isValidSchoolDate } from "../utils/school-date.js";

const id = z.string().regex(/^[a-f\d]{24}$/i, "Enter a valid record ID.");
const schoolDate = z.string().refine(isValidSchoolDate, "Use a real calendar date in YYYY-MM-DD format.");
const listSchema = z.object({
  classSectionId: id.optional(),
  from: schoolDate.optional(),
  to: schoolDate.optional(),
  limit: z.coerce.number().int().min(1).max(250).default(100),
}).refine((query) => !query.from || !query.to || query.from <= query.to, "The from date must be before the to date.");
const recordSchema = z.object({
  classSectionId: id,
  schoolDate,
  records: z.array(z.object({
    studentId: id,
    status: z.enum(["present", "absent", "late", "excused"]),
    note: z.string().trim().max(300).optional(),
  }).strict()).min(1).max(250),
}).strict();

export function createAttendanceRouter(models, env) {
  const router = Router();
  const authenticate = createAuthenticate(models, env);
  const controller = createAttendanceController(models);

  router.get("/", authenticate, requireRoles("admin", "teacher", "parent"), validateQuery(listSchema), controller.list);
  router.post(
    "/class",
    authenticate,
    requireRoles("admin", "teacher"),
    validate(recordSchema),
    controller.recordClass,
  );

  return router;
}