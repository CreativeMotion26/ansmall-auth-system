import type { Response } from "express";
import { Router } from "express";
import bcrypt from "bcryptjs";
import {
  createUser,
  deleteRefreshTokenByHash,
  findUserByEmail,
  findUserById,
  findValidRefreshTokenUserId,
  insertRefreshToken,
  type UserRow,
} from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  ACCESS_TOKEN_EXPIRES_SEC,
  REFRESH_TOKEN_EXPIRES_SEC,
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
} from "../tokens.js";

const MIN_PASSWORD_LENGTH = 8;

function validateEmail(email: unknown): string | null {
  if (typeof email !== "string") return null;
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length < 3 || trimmed.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return trimmed;
}

function sendTokenBundle(res: Response, user: UserRow, status = 200): void {
  const accessToken = signAccessToken(user.id);
  const refreshToken = generateRefreshToken();
  const tokenHash = hashRefreshToken(refreshToken);
  const expiresAtUnix =
    Math.floor(Date.now() / 1000) + REFRESH_TOKEN_EXPIRES_SEC;
  insertRefreshToken(user.id, tokenHash, expiresAtUnix);

  res.status(status).json({
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRES_SEC,
    user: { id: user.id, email: user.email },
  });
}

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const email = validateEmail(req.body?.email);
  const password = req.body?.password;

  if (!email) {
    res.status(400).json({ error: "Invalid email" });
    return;
  }
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    res.status(400).json({
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    });
    return;
  }

  if (findUserByEmail(email)) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = createUser(email, passwordHash);
  sendTokenBundle(res, user, 201);
});

authRouter.post("/login", async (req, res) => {
  const email = validateEmail(req.body?.email);
  const password = req.body?.password;

  if (!email || typeof password !== "string") {
    res.status(400).json({ error: "Invalid email or password" });
    return;
  }

  const user = findUserByEmail(email);
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  sendTokenBundle(res, user);
});

/**
 * Body: { refreshToken }. Rotates refresh token (old row deleted, new one issued).
 */
authRouter.post("/refresh", (req, res) => {
  const raw = req.body?.refreshToken;
  if (typeof raw !== "string" || raw.length < 16) {
    res.status(400).json({ error: "refreshToken required" });
    return;
  }

  const hash = hashRefreshToken(raw);
  const now = Math.floor(Date.now() / 1000);
  const userId = findValidRefreshTokenUserId(hash, now);
  if (userId == null) {
    res.status(401).json({ error: "Invalid or expired refresh token" });
    return;
  }

  deleteRefreshTokenByHash(hash);

  const user = findUserById(userId);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  sendTokenBundle(res, user);
});

/**
 * Body: { refreshToken }. Revokes that refresh token (does not invalidate JWT until it expires).
 */
authRouter.post("/logout", (req, res) => {
  const raw = req.body?.refreshToken;
  if (typeof raw !== "string" || raw.length < 16) {
    res.status(400).json({ error: "refreshToken required to revoke" });
    return;
  }
  const hash = hashRefreshToken(raw);
  deleteRefreshTokenByHash(hash);
  res.json({ message: "Refresh token revoked" });
});

authRouter.get("/me", requireAuth, (req, res) => {
  const user = findUserById(req.userId!);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  res.json({ user: { id: user.id, email: user.email } });
});
