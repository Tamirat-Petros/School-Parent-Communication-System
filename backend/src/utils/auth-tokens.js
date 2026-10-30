import { createHash, randomBytes } from "node:crypto";

export function createRefreshToken() {
  return randomBytes(48).toString("base64url");
}

export function hashRefreshToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function readCookie(request, cookieName) {
  const cookieHeader = request.headers.cookie ?? "";
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(cookieName + "="));

  return cookie ? decodeURIComponent(cookie.slice(cookieName.length + 1)) : null;
}

export function refreshCookieOptions(env = process.env) {
  return {
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/api/auth",
    sameSite: "strict",
    secure: env.NODE_ENV === "production",
  };
}

export function publicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    role: user.role,
    isActive: user.isActive,
    mfaEnabled: Boolean(user.mfaEnabled),
  };
}