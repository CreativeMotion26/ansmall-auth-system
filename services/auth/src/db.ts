import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const dbPath = path.join(dataDir, "app.db");

fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");
db.pragma("foreign_keys = ON");

const schemaPath = path.join(__dirname, "..", "sql", "schema.sql");
const schemaSql = fs.readFileSync(schemaPath, "utf8");
db.exec(schemaSql);

function migrateDatabase(): void {
  db.exec(`DROP TABLE IF EXISTS sessions`);

  const refreshColumns = db
    .prepare(`PRAGMA table_info(refresh_tokens)`)
    .all() as { name: string }[];

  if (refreshColumns.length > 0 && refreshColumns.some((c) => c.name === "id")) {
    const migrateRefreshTokens = db.transaction(() => {
      db.exec(`DROP INDEX IF EXISTS idx_refresh_tokens_user_id`);
      db.exec(`
        CREATE TABLE refresh_tokens_new (
          token_hash TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL,
          expires_at INTEGER NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        ) WITHOUT ROWID
      `);
      db.exec(`
        INSERT INTO refresh_tokens_new (token_hash, user_id, expires_at)
        SELECT token_hash, user_id, expires_at FROM refresh_tokens
      `);
      db.exec(`DROP TABLE refresh_tokens`);
      db.exec(`ALTER TABLE refresh_tokens_new RENAME TO refresh_tokens`);
      db.exec(
        `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens (expires_at)`,
      );
    });
    migrateRefreshTokens();
  }

  const userColumns = db
    .prepare(`PRAGMA table_info(users)`)
    .all() as { name: string; type: string }[];
  const createdAtCol = userColumns.find((c) => c.name === "created_at");

  if (userColumns.length > 0 && createdAtCol?.type.toUpperCase() === "TEXT") {
    const migrateUsers = db.transaction(() => {
      db.pragma("foreign_keys = OFF");
      db.exec(`
        CREATE TABLE users_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL
            CHECK (length(trim(password_hash)) > 0),
          created_at INTEGER NOT NULL DEFAULT (unixepoch())
        )
      `);
      db.exec(`
        INSERT INTO users_new (id, email, password_hash, created_at)
        SELECT id, email, password_hash, unixepoch(created_at) FROM users
      `);
      db.exec(`DROP TABLE users`);
      db.exec(`ALTER TABLE users_new RENAME TO users`);
      db.pragma("foreign_keys = ON");
    });
    migrateUsers();
  }
}

migrateDatabase();

export type UserRow = {
  id: number;
  email: string;
  password_hash: string;
  created_at: number;
};

const stmtFindUserByEmail = db.prepare(
  `SELECT id, email, password_hash, created_at FROM users WHERE email = ?`,
);
const stmtFindUserById = db.prepare(
  `SELECT id, email, password_hash, created_at FROM users WHERE id = ?`,
);
const stmtInsertUser = db.prepare(
  `INSERT INTO users (email, password_hash) VALUES (?, ?)`,
);
const stmtInsertRefreshToken = db.prepare(
  `INSERT INTO refresh_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)`,
);
const stmtFindValidRefreshToken = db.prepare(
  `SELECT user_id FROM refresh_tokens WHERE token_hash = ? AND expires_at > ?`,
);
const stmtDeleteRefreshToken = db.prepare(
  `DELETE FROM refresh_tokens WHERE token_hash = ?`,
);
const stmtDeleteExpiredRefreshTokens = db.prepare(
  `DELETE FROM refresh_tokens WHERE expires_at <= ?`,
);
const stmtUpdatePassword = db.prepare(
  `UPDATE users SET password_hash = ? WHERE id = ?`,
);
const stmtDeleteUser = db.prepare(`DELETE FROM users WHERE id = ?`);
const stmtDeleteRefreshTokensForUser = db.prepare(
  `DELETE FROM refresh_tokens WHERE user_id = ?`,
);

export function findUserByEmail(email: string): UserRow | undefined {
  return stmtFindUserByEmail.get(email.trim().toLowerCase()) as
    | UserRow
    | undefined;
}

export function findUserById(id: number): UserRow | undefined {
  return stmtFindUserById.get(id) as UserRow | undefined;
}

export function createUser(email: string, passwordHash: string): UserRow {
  const normalized = email.trim().toLowerCase();
  const result = stmtInsertUser.run(normalized, passwordHash);
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
  stmtInsertRefreshToken.run(tokenHash, userId, expiresAtUnix);
}

export function findValidRefreshTokenUserId(
  tokenHash: string,
  nowUnix: number,
): number | null {
  const row = stmtFindValidRefreshToken.get(tokenHash, nowUnix) as
    | { user_id: number }
    | undefined;
  return row ? row.user_id : null;
}

export function deleteRefreshTokenByHash(tokenHash: string): number {
  return stmtDeleteRefreshToken.run(tokenHash).changes;
}

export function deleteExpiredRefreshTokens(nowUnix: number): number {
  return stmtDeleteExpiredRefreshTokens.run(nowUnix).changes;
}

export function updateUserPassword(
  userId: number,
  passwordHash: string,
): boolean {
  return stmtUpdatePassword.run(passwordHash, userId).changes > 0;
}

export function deleteUser(userId: number): boolean {
  return stmtDeleteUser.run(userId).changes > 0;
}

export function deleteRefreshTokensForUser(userId: number): number {
  return stmtDeleteRefreshTokensForUser.run(userId).changes;
}

deleteExpiredRefreshTokens(Math.floor(Date.now() / 1000));
