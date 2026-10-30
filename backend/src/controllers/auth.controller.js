import bcrypt from "bcryptjs";
import { HttpError } from "../utils/http-error.js";
import {
  hashRefreshToken,
  publicUser,
  readCookie,
  refreshCookieOptions,
  createRefreshToken,
} from "../utils/auth-tokens.js";
import { signToken } from "../config/security.js";
import {
  createOtpAuthUri,
  decryptMfaSecret,
  encryptMfaSecret,
  generateTotpSecret,
  verifyTotpCode,
} from "../utils/mfa.js";
import { writeAuditLog } from "../utils/audit.js";

const REFRESH_COOKIE = "spcsRefresh";
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const DUMMY_PASSWORD_HASH = "$2b$12$Dap7SOEUgIOwzeM6/SEEred0DznFGqpjC.VRq5j/YikWt81Ti3y2O";

function setRefreshCookie(response, token, env) {
  response.cookie(REFRESH_COOKIE, token, refreshCookieOptions(env));
}

function clearRefreshCookie(response, env) {
  response.clearCookie(REFRESH_COOKIE, refreshCookieOptions(env));
}

async function createSession(user, models, response, env) {
  const refreshToken = createRefreshToken();
  await models.RefreshSession.create({
    userId: user._id,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    lastUsedAt: new Date(),
  });
  setRefreshCookie(response, refreshToken, env);

  return {
    accessToken: signToken(user, "access", env),
    tokenType: "Bearer",
    expiresIn: 900,
    user: publicUser(user),
  };
}

function rejectIfUntrustedOrigin(request, env) {
  const origin = request.get("origin");
  const allowedOrigin = env.CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
  if (origin && origin !== allowedOrigin) {
    throw new HttpError(403, "ORIGIN_NOT_ALLOWED", "This request origin is not allowed.");
  }
}

export function createAuthController(models, env) {
  return {
    login: async (request, response) => {
      const email = request.body.email.toLowerCase();
      const user = await models.User.findOne({ email }).select(
        "+passwordHash +mfaSecretEncrypted +pendingMfaSecretEncrypted",
      );
      const passwordHash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
      const passwordMatches = await bcrypt.compare(request.body.password, passwordHash);

      if (!user || !passwordMatches) {
        await writeAuditLog(models, request, { action: "auth.login.failed", entityType: "User" });
        throw new HttpError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
      }

      if (!user.isActive) {
        await writeAuditLog(models, request, {
          action: "auth.login.blocked",
          entityType: "User",
          entityId: user._id,
        });
        throw new HttpError(403, "ACCOUNT_INACTIVE", "This account is inactive. Contact a school administrator.");
      }

      await writeAuditLog(models, request, {
        action: "auth.login.password_verified",
        entityType: "User",
        entityId: user._id,
      });

      if (user.role === "admin" && !user.mfaEnabled) {
        return response.json({
          mfaSetupRequired: true,
          token: signToken(user, "mfa-setup", env, "10m"),
        });
      }

      if (user.role === "admin") {
        return response.json({
          mfaRequired: true,
          token: signToken(user, "mfa-challenge", env, "5m"),
        });
      }

      return response.json(await createSession(user, models, response, env));
    },

    enrollMfa: async (request, response) => {
      const user = request.authUser;
      if (user.mfaEnabled) {
        throw new HttpError(409, "MFA_ALREADY_ENABLED", "Two-factor authentication is already enabled.");
      }

      const secret = generateTotpSecret();
      user.pendingMfaSecretEncrypted = encryptMfaSecret(secret, env);
      await user.save();

      return response.json({
        secret,
        otpauthUri: createOtpAuthUri(user.email, secret),
      });
    },

    enableMfa: async (request, response) => {
      const user = await models.User.findById(request.authUser._id)
        .select("+pendingMfaSecretEncrypted +mfaSecretEncrypted");
      if (!user?.pendingMfaSecretEncrypted) {
        throw new HttpError(409, "MFA_SETUP_NOT_STARTED", "Start two-factor setup before confirming it.");
      }

      const secret = decryptMfaSecret(user.pendingMfaSecretEncrypted, env);
      if (!verifyTotpCode(secret, request.body.code)) {
        throw new HttpError(400, "INVALID_MFA_CODE", "The authenticator code is invalid or expired.");
      }

      user.mfaSecretEncrypted = user.pendingMfaSecretEncrypted;
      user.pendingMfaSecretEncrypted = undefined;
      user.mfaEnabled = true;
      await user.save();

      await writeAuditLog(models, request, {
        action: "auth.mfa.enabled",
        entityType: "User",
        entityId: user._id,
      });

      return response.status(201).json(await createSession(user, models, response, env));
    },

    verifyMfa: async (request, response) => {
      const user = await models.User.findById(request.authUser._id).select("+mfaSecretEncrypted");
      if (!user?.mfaEnabled || !user.mfaSecretEncrypted) {
        throw new HttpError(409, "MFA_NOT_ENABLED", "Two-factor authentication is not enabled for this account.");
      }

      const secret = decryptMfaSecret(user.mfaSecretEncrypted, env);
      if (!verifyTotpCode(secret, request.body.code)) {
        await writeAuditLog(models, request, {
          action: "auth.mfa.failed",
          entityType: "User",
          entityId: user._id,
        });
        throw new HttpError(401, "INVALID_MFA_CODE", "The authenticator code is invalid or expired.");
      }

      await writeAuditLog(models, request, {
        action: "auth.mfa.verified",
        entityType: "User",
        entityId: user._id,
      });

      return response.json(await createSession(user, models, response, env));
    },

    refresh: async (request, response) => {
      rejectIfUntrustedOrigin(request, env);
      const refreshToken = readCookie(request, REFRESH_COOKIE);
      if (!refreshToken) {
        throw new HttpError(401, "SESSION_EXPIRED", "Sign in again to continue.");
      }

      const session = await models.RefreshSession.findOneAndDelete({
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt: { $gt: new Date() },
      });
      if (!session) {
        clearRefreshCookie(response, env);
        throw new HttpError(401, "SESSION_EXPIRED", "Sign in again to continue.");
      }

      const user = await models.User.findById(session.userId);
      if (!user || !user.isActive) {
        clearRefreshCookie(response, env);
        throw new HttpError(401, "ACCOUNT_UNAVAILABLE", "This account is unavailable.");
      }

      return response.json(await createSession(user, models, response, env));
    },

    logout: async (request, response) => {
      rejectIfUntrustedOrigin(request, env);
      const refreshToken = readCookie(request, REFRESH_COOKIE);
      if (refreshToken) {
        await models.RefreshSession.deleteOne({ tokenHash: hashRefreshToken(refreshToken) });
      }
      clearRefreshCookie(response, env);
      return response.status(204).end();
    },

    me: async (request, response) => response.json({ user: publicUser(request.user) }),

    changePassword: async (request, response) => {
      const user = await models.User.findById(request.user._id).select("+passwordHash");
      if (!user) throw new HttpError(404, "USER_NOT_FOUND", "Account was not found.");

      const currentMatches = await bcrypt.compare(request.body.currentPassword, user.passwordHash);
      if (!currentMatches) {
        throw new HttpError(400, "CURRENT_PASSWORD_INVALID", "Current password is incorrect.");
      }

      if (request.body.currentPassword === request.body.newPassword) {
        throw new HttpError(400, "PASSWORD_UNCHANGED", "Choose a new password different from the current one.");
      }

      user.passwordHash = await bcrypt.hash(request.body.newPassword, 12);
      user.passwordChangedAt = new Date();
      await user.save();

      await models.RefreshSession.deleteMany({ userId: user._id });
      await writeAuditLog(models, request, {
        action: "auth.password.changed",
        entityType: "User",
        entityId: user._id,
      });

      clearRefreshCookie(response, env);
      return response.json({ message: "Password changed. Sign in again on your devices." });
    },
  };
}