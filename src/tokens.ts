import crypto from "node:crypto";
import jwt from "jsonwebtoken";

export const ACCESS_TOKEN_EXPIRES_SEC = 15 * 60;
export const REFRESH_TOKEN_EXPIRES_SEC = 7 * 24 * 60 * 60;

function accessSecret(): string {
  return process.env.ACCESS_TOKEN_SECRET || "dev-access-secret-change-me";
}

export function signAccessToken(userId: number): string {
  return jwt.sign({ sub: String(userId) }, accessSecret(), {
    expiresIn: ACCESS_TOKEN_EXPIRES_SEC,
  });
}

export function verifyAccessToken(token: string): { userId: number } | null {
  try {
    const decoded = jwt.verify(token, accessSecret()) as jwt.JwtPayload;
    const sub = decoded.sub;
    const userId =
      typeof sub === "string"
        ? Number(sub)
        : typeof sub === "number"
          ? sub
          : NaN;
    if (!Number.isFinite(userId) || userId <= 0) return null;
    return { userId };
  } catch {
    return null;
  }
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashRefreshToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function assertAccessSecretInProduction(): void {
  if (process.env.NODE_ENV === "production" && !process.env.ACCESS_TOKEN_SECRET) {
    console.error("Set ACCESS_TOKEN_SECRET in production.");
    process.exit(1);
  }
}
