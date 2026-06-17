-- ansmall-auth-system — SQLite database design
-- Applied on startup (see src/db.ts). Safe to re-run: uses IF NOT EXISTS.

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- users
-- Email is stored lowercase (normalized in application code).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
    CHECK (length(trim(password_hash)) > 0),
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- ---------------------------------------------------------------------------
-- refresh_tokens
-- Opaque refresh tokens are sent to the client; only SHA-256 hashes are stored.
-- expires_at is Unix seconds (UTC). Rotated on each POST /api/refresh.
-- WITHOUT ROWID: rows live in the PK index (every lookup is by token_hash).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);
