import jwt from "jsonwebtoken";

export const JWT_ISSUER = "spcs-api";
export const JWT_AUDIENCE = "spcs-clients";
export const ACCESS_TOKEN_TTL = "15m";

export function getJwtSecret(env = process.env) {
  const secret = env.JWT_SECRET;

  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("JWT_SECRET must be set to a random value with at least 32 characters.");
  }

  return secret;
}

export function signToken(user, tokenUse, env = process.env, expiresIn = ACCESS_TOKEN_TTL) {
  return jwt.sign(
    { role: user.role, tokenUse },
    getJwtSecret(env),
    {
      algorithm: "HS256",
      audience: JWT_AUDIENCE,
      expiresIn,
      issuer: JWT_ISSUER,
      subject: String(user._id),
    },
  );
}

export function verifyToken(token, env = process.env) {
  return jwt.verify(token, getJwtSecret(env), {
    algorithms: ["HS256"],
    audience: JWT_AUDIENCE,
    issuer: JWT_ISSUER,
  });
}