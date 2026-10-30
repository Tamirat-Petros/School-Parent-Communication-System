import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function encryptionKey(env = process.env) {
  const encodedKey = env.MFA_ENCRYPTION_KEY ?? "";
  const key = Buffer.from(encodedKey, "hex");

  if (!/^[a-f0-9]{64}$/i.test(encodedKey) || key.length !== 32) {
    throw new Error("MFA_ENCRYPTION_KEY must be a 32-byte hexadecimal value.");
  }

  return key;
}

export function encryptMfaSecret(secret, env = process.env) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(env), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("hex")).join(":");
}

export function decryptMfaSecret(value, env = process.env) {
  const [ivHex, tagHex, encryptedHex] = value.split(":");
  if (!ivHex || !tagHex || !encryptedHex) throw new Error("Stored MFA secret is invalid.");

  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(env), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

export function generateTotpSecret() {
  const bytes = randomBytes(20);
  let bits = 0;
  let value = 0;
  let encoded = "";

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      encoded += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) encoded += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return encoded;
}

function decodeBase32(encoded) {
  let bits = 0;
  let value = 0;
  const bytes = [];

  for (const character of encoded.toUpperCase().replace(/=+$/u, "")) {
    const digit = BASE32_ALPHABET.indexOf(character);
    if (digit < 0) throw new Error("Invalid TOTP secret.");

    value = (value << 5) | digit;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

export function createTotpCode(secret, time = Date.now()) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(time / 30_000)));
  const digest = createHmac("sha1", decodeBase32(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 15;
  const binary =
    ((digest[offset] & 127) << 24) |
    ((digest[offset + 1] & 255) << 16) |
    ((digest[offset + 2] & 255) << 8) |
    (digest[offset + 3] & 255);

  return String(binary % 1_000_000).padStart(6, "0");
}

export function verifyTotpCode(secret, code, time = Date.now()) {
  if (!/^\d{6}$/.test(code)) return false;

  for (const offset of [-30_000, 0, 30_000]) {
    const expected = Buffer.from(createTotpCode(secret, time + offset));
    const actual = Buffer.from(code);
    if (expected.length === actual.length && timingSafeEqual(expected, actual)) return true;
  }

  return false;
}

export function createOtpAuthUri(email, secret) {
  const label = encodeURIComponent("SPCS:" + email);
  return "otpauth://totp/" + label + "?secret=" + secret + "&issuer=SPCS&algorithm=SHA1&digits=6&period=30";
}