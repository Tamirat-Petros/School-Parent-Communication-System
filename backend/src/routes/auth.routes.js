import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { createAuthController } from "../controllers/auth.controller.js";
import { createAuthenticate, createRequireSpecialToken } from "../middleware/authenticate.js";
import { validate } from "../utils/validation.js";

const email = z.string().trim().email().max(254);
const password = z.string().min(12).max(128);
const tokenSchema = z.object({ token: z.string().min(20).max(4096) }).strict();
const codeSchema = tokenSchema.extend({ code: z.string().regex(/^\d{6}$/) }).strict();

export function createAuthRouter(models, env) {
  const router = Router();
  const controller = createAuthController(models, env);
  const authenticate = createAuthenticate(models, env);
  const requireSetupToken = createRequireSpecialToken(models, env, "mfa-setup");
  const requireChallengeToken = createRequireSpecialToken(models, env, "mfa-challenge");

  const loginLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { error: { code: "LOGIN_RATE_LIMITED", message: "Too many sign-in attempts. Try again later." } },
  });

  router.post(
    "/login",
    loginLimit,
    validate(z.object({ email, password: z.string().min(1).max(128) }).strict()),
    controller.login,
  );
  router.post("/mfa/enroll", requireSetupToken, controller.enrollMfa);
  router.post("/mfa/enable", requireSetupToken, validate(codeSchema), controller.enableMfa);
  router.post("/mfa/verify", requireChallengeToken, validate(codeSchema), controller.verifyMfa);
  router.post("/refresh", controller.refresh);
  router.post("/logout", controller.logout);
  router.get("/me", authenticate, controller.me);
  router.post(
    "/password/change",
    authenticate,
    validate(z.object({ currentPassword: z.string().min(1).max(128), newPassword: password }).strict()),
    controller.changePassword,
  );

  return router;
}