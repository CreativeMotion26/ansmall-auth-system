# ansmall-auth-system

Small learning project: **register**, **login**, **logout**, and **`GET /api/me`** using **JWT access tokens** plus **rotating refresh tokens** stored (hashed) in **SQLite**. Passwords are hashed with **bcrypt**.

- **Access token**: JWT, short-lived (15 minutes by default).
- **Refresh token**: opaque random string; only a **SHA-256 hash** is stored. Exchanged via **`POST /api/refresh`**; each refresh **rotates** the refresh token (old one stops working).

The demo page keeps tokens in **`localStorage`** (fine for learning; production SPAs often prefer `httpOnly` cookies for refresh tokens to reduce XSS impact).

The database layout is in **`sql/schema.sql`** (applied on startup).

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use **Authorization: Bearer &lt;accessToken&gt;** on `/api/me`.

Copy `.env.example` to `.env`. In production, set **`ACCESS_TOKEN_SECRET`** (required).

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/register` | Body: `{ "email", "password" }` → `{ accessToken, refreshToken, expiresIn, user }` |
| POST | `/api/login` | Same body and response |
| POST | `/api/refresh` | Body: `{ "refreshToken" }` → new access + **new** refresh (rotation) |
| POST | `/api/logout` | Body: `{ "refreshToken" }` → revoke that refresh token |
| GET | `/api/me` | Header: `Authorization: Bearer <accessToken>` |

Rate limit: **50 requests / 15 minutes** per IP on `/api/register`, `/api/login`, and `/api/refresh`.

## Layout

- `src/server.ts` — Express app, static files
- `src/tokens.ts` — JWT sign/verify, refresh token generation + hashing
- `sql/schema.sql` — SQL DDL
- `src/db.ts` — DB + refresh token rows
- `src/routes/auth.ts` — auth handlers
- `src/middleware/requireAuth.ts` — Bearer JWT guard
- `public/` — demo page (`index.html`, `app.js`)
