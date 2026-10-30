import { Router } from "express";
import { z } from "zod";
import { createReportsController } from "../controllers/reports.controller.js";
import { createAuthenticate, requireRoles } from "../middleware/authenticate.js";
import { validateQuery } from "../utils/validation.js";
import { isValidSchoolDate } from "../utils/school-date.js";

const id = z.string().regex(/^[a-f\d]{24}$/i, "Enter a valid record ID.");
const date = z.string().refine(isValidSchoolDate, "Use a real calendar date in YYYY-MM-DD format.");
const reportQuery = z.object({
  from: date.optional(),
  to: date.optional(),
  classSectionId: id.optional(),
}).refine((query) => !query.from || !query.to || query.from <= query.to, "The from date must be before the to date.");
const auditQuery = z.object({
  action: z.string().trim().max(100).optional(),
  entityType: z.string().trim().max(80).optional(),
  before: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export function createReportsRouter(models, env) {
  const router = Router();
  const authenticate = createAuthenticate(models, env);
  const adminOnly = [authenticate, requireRoles("admin")];
  const controller = createReportsController(models, env);

  router.get("/summary", ...adminOnly, validateQuery(reportQuery), controller.summary);
  router.get(
    "/student/:studentId",
    authenticate,
    requireRoles("admin", "teacher", "parent"),
    validateQuery(reportQuery),
    controller.student,
  );
  router.get("/audit-logs", ...adminOnly, validateQuery(auditQuery), controller.auditLogs);

  return router;
}