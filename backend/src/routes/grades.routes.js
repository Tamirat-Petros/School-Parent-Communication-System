import { Router } from "express";
import { z } from "zod";
import { createGradesController } from "../controllers/grades.controller.js";
import { createAuthenticate, requireRoles } from "../middleware/authenticate.js";
import { validate, validateQuery } from "../utils/validation.js";
import { isValidSchoolDate } from "../utils/school-date.js";

const id = z.string().regex(/^[a-f\d]{24}$/i, "Enter a valid record ID.");
const schoolDate = z.string().refine(isValidSchoolDate, "Use a real calendar date in YYYY-MM-DD format.");
const listSchema = z.object({
  classSectionId: id.optional(),
  subject: z.string().trim().max(80).optional(),
  from: schoolDate.optional(),
  to: schoolDate.optional(),
  limit: z.coerce.number().int().min(1).max(250).default(100),
}).refine((query) => !query.from || !query.to || query.from <= query.to, "The from date must be before the to date.");
const createSchema = z.object({
  classSectionId: id,
  subject: z.string().trim().min(1).max(80),
  assessmentName: z.string().trim().min(1).max(120),
  assessmentType: z.enum(["quiz", "test", "exam", "homework", "project", "other"]).default("other"),
  assessmentDate: schoolDate,
  maxScore: z.number().positive().max(10000),
  scores: z.array(z.object({
    studentId: id,
    score: z.number().min(0),
    remark: z.string().trim().max(500).optional(),
  }).strict()).min(1).max(250),
}).strict().refine((value) => value.scores.every((item) => item.score <= value.maxScore), {
  message: "A score cannot exceed maxScore.",
  path: ["scores"],
});
const updateSchema = z.object({
  score: z.number().min(0).optional(),
  maxScore: z.number().positive().max(10000).optional(),
  remark: z.string().trim().max(500).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "Provide at least one field.");

export function createGradesRouter(models, env) {
  const router = Router();
  const authenticate = createAuthenticate(models, env);
  const controller = createGradesController(models);

  router.get("/", authenticate, requireRoles("admin", "teacher", "parent"), validateQuery(listSchema), controller.list);
  router.post(
    "/class-assessment",
    authenticate,
    requireRoles("admin", "teacher"),
    validate(createSchema),
    controller.createAssessment,
  );
  router.patch("/:gradeId", authenticate, requireRoles("admin", "teacher"), validate(updateSchema), controller.update);

  return router;
}