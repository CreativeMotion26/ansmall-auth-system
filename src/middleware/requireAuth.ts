import type { RequestHandler } from "express";
import { verifyAccessToken } from "../tokens.js";

/**
 * Requires `Authorization: Bearer <access JWT>`.
 */
export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }
  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    res.status(401).json({ error: "Missing access token" });
    return;
  }
  const payload = verifyAccessToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired access token" });
    return;
  }
  req.userId = payload.userId;
  next();
};
