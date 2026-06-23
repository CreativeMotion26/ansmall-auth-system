import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import helmet from "helmet";
import { createProxyMiddleware } from "http-proxy-middleware";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Shared demo UI at repo root (see README)
const publicDir = path.join(__dirname, "..", "..", "..", "public");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const AUTH_URL = process.env.AUTH_URL || "http://localhost:3001";

app.use(helmet());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, DELETE, OPTIONS",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(
  "/api",
  createProxyMiddleware({
    target: AUTH_URL,
    changeOrigin: true,
    xfwd: true,
  }),
);

app.use(express.static(publicDir));

app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Gateway http://localhost:${PORT} -> ${AUTH_URL}`);
});

