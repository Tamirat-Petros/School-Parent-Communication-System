import { Router } from "express";
import { z } from "zod";
import { createUsersController } from "../controllers/users.controller.js";
import { createAuthenticate, requireRoles } from "../middleware/authenticate.js";
import { validate, validateQuery } from "../utils/validation.js";

const role = z.enum(["parent", "teacher", "admin"]);
const password = z.string().min(12).max(128);
const createSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(7).max(32).optional(),
  role,
  password,
}).strict();
const listSchema = z.object({
  role: role.optional(),
  active: z.enum(["true", "false"]).optional(),
  search: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
const statusSchema = z.object({ isActive: z.boolean() }).strict();

export function createUsersRouter(models, env) {
  const router = Router();
  const authenticate = createAuthenticate(models, env);
  const adminOnly = [authenticate, requireRoles("admin")];
  const controller = createUsersController(models);

  router.get("/", ...adminOnly, validateQuery(listSchema), controller.list);
  router.post("/", ...adminOnly, validate(createSchema), controller.create);
  router.patch("/:userId/status", ...adminOnly, validate(statusSchema), controller.updateStatus);

  return router;
}