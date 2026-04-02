-- ansmall-auth-system — SQLite database design
-- Run automatically on startup (see src/db.ts). Safe to re-run: uses IF NOT EXISTS.

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL
    CHECK (length(trim(password_hash)) > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (email COLLATE NOCASE)
);

-- ---------------------------------------------------------------------------
-- refresh_tokens
-- Opaque refresh tokens are sent to the client; only SHA-256 hashes are stored.
-- expires_at is Unix seconds (UTC). Rotated on each POST /api/refresh.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (token_hash),
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);

-- ---------------------------------------------------------------------------
-- sessions (legacy / optional SQLite session store shape — unused with JWT flow)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  sid TEXT PRIMARY KEY,
  sess TEXT NOT NULL,
  expired INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_expired ON sessions (expired);
