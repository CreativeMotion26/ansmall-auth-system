import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const dbPath = path.join(dataDir, "app.db");

fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);

const schemaPath = path.join(__dirname, "..", "sql", "schema.sql");
const schemaSql = fs.readFileSync(schemaPath, "utf8");
db.exec(schemaSql);

export type UserRow = {
  id: number;
  email: string;
  password_hash: string;
  created_at: string;
};

export function findUserByEmail(email: string): UserRow | undefined {
  const row = db
    .prepare(
      `SELECT id, email, password_hash, created_at FROM users WHERE email = ?`,
    )
    .get(email.trim().toLowerCase()) as UserRow | undefined;
  return row;
}

export function findUserById(id: number): UserRow | undefined {
  return db
    .prepare(
      `SELECT id, email, password_hash, created_at FROM users WHERE id = ?`,
    )
    .get(id) as UserRow | undefined;
}

export function createUser(email: string, passwordHash: string): UserRow {
  const normalized = email.trim().toLowerCase();
  const result = db
    .prepare(`INSERT INTO users (email, password_hash) VALUES (?, ?)`)
    .run(normalized, passwordHash);
  const id = Number(result.lastInsertRowid);
  const user = findUserById(id);
  if (!user) {
    throw new Error("Failed to create user");
  }
  return user;
}

export function insertRefreshToken(
  userId: number,
  tokenHash: string,
  expiresAtUnix: number,
): void {
  db.prepare(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)`,
  ).run(userId, tokenHash, expiresAtUnix);
}

export function findValidRefreshTokenUserId(
  tokenHash: string,
  nowUnix: number,
): number | null {
  const row = db
    .prepare(
      `SELECT user_id FROM refresh_tokens WHERE token_hash = ? AND expires_at > ?`,
    )
    .get(tokenHash, nowUnix) as { user_id: number } | undefined;
  return row ? row.user_id : null;
}

export function deleteRefreshTokenByHash(tokenHash: string): number {
  const info = db
    .prepare(`DELETE FROM refresh_tokens WHERE token_hash = ?`)
    .run(tokenHash);
  return info.changes;
}
