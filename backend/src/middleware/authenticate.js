import { HttpError } from "../utils/http-error.js";
import { verifyToken } from "../config/security.js";

function bearerToken(request) {
  const header = request.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
}

export function createAuthenticate(models, env) {
  return async (request, _response, next) => {
    const token = bearerToken(request);
    if (!token) return next(new HttpError(401, "AUTH_REQUIRED", "Sign in to continue."));

    try {
      const claims = verifyToken(token, env);
      if (claims.tokenUse !== "access") {
        return next(new HttpError(401, "INVALID_TOKEN", "This token cannot access the requested resource."));
      }

      const user = await models.User.findById(claims.sub);
      if (!user || !user.isActive) {
        return next(new HttpError(401, "ACCOUNT_UNAVAILABLE", "This account is unavailable."));
      }

      request.user = user;
      return next();
    } catch (error) {
      if (error instanceof HttpError) return next(error);
      return next(new HttpError(401, "INVALID_TOKEN", "The access token is invalid or expired."));
    }
  };
}

export function createRequireSpecialToken(models, env, expectedUse) {
  return async (request, _response, next) => {
    const token = request.body?.token;
    if (typeof token !== "string") {
      return next(new HttpError(401, "AUTH_REQUIRED", "A valid authentication token is required."));
    }

    try {
      const claims = verifyToken(token, env);
      if (claims.tokenUse !== expectedUse) {
        return next(new HttpError(401, "INVALID_TOKEN", "This token cannot be used for this action."));
      }

      const user = await models.User.findById(claims.sub);
      if (!user || !user.isActive || user.role !== "admin") {
        return next(new HttpError(401, "ACCOUNT_UNAVAILABLE", "This account is unavailable."));
      }

      request.authUser = user;
      request.authClaims = claims;
      return next();
    } catch {
      return next(new HttpError(401, "INVALID_TOKEN", "The authentication token is invalid or expired."));
    }
  };
}

export function requireRoles(...roles) {
  return (request, _response, next) => {
    if (!request.user || !roles.includes(request.user.role)) {
      return next(new HttpError(403, "FORBIDDEN", "You do not have permission to perform this action."));
    }
    return next();
  };
}