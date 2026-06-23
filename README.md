# ansmall-auth-system

Small learning project: **register**, **login**, **logout**, and **`GET /api/me`** using **JWT access tokens** plus **rotating refresh tokens** stored (hashed) in **SQLite**. Passwords are hashed with **bcrypt**.

- **Access token**: JWT, short-lived (15 minutes by default).
- **Refresh token**: opaque random string; only a **SHA-256 hash** is stored. Exchanged via **`POST /api/refresh`**; each refresh **rotates** the refresh token (old one stops working).

The demo page keeps tokens in **`localStorage`** (fine for learning; production SPAs often prefer `httpOnly` cookies for refresh tokens to reduce XSS impact).

The database layout is in **`services/auth/sql/schema.sql`** (applied on startup).

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use **Authorization: Bearer &lt;accessToken&gt;** on `/api/me`.

Copy `.env.example` to `.env`. In production, set **`ACCESS_TOKEN_SECRET`** (required).

## API documentation

Full reference: **[`docs/API.md`](docs/API.md)** — request/response shapes, curl examples, auth flow.

OpenAPI 3 spec: **[`docs/openapi.yaml`](docs/openapi.yaml)** — import into [Swagger Editor](https://editor.swagger.io/) or use with code generators.

| Method | Path | Summary |
|--------|------|---------|
| GET | `/api/health` | Health check |
| POST | `/api/register` | Create account → tokens |
| POST | `/api/login` | Sign in → tokens |
| POST | `/api/refresh` | Rotate refresh token → new tokens |
| POST | `/api/logout` | Revoke one refresh token |
| POST | `/api/logout-all` | Revoke all refresh tokens (Bearer) |
| GET | `/api/me` | Current user (Bearer) |
| PATCH | `/api/me/password` | Change password (Bearer) |
| DELETE | `/api/me` | Delete account (Bearer) |

Rate limit: **50 requests / 15 minutes** per IP on `/api/register`, `/api/login`, and `/api/refresh`.

## Mobile app (Expo)

```bash
npm run dev          # gateway + auth (terminal 1)
npm run dev:mobile   # Expo (terminal 2)
```

1. Copy `apps/mobile/.env.example` → `apps/mobile/.env`
2. Set `EXPO_PUBLIC_API_BASE_URL` to your gateway:
   - **iOS simulator / web:** `http://localhost:3000`
   - **Android emulator:** `http://10.0.2.2:3000` (default when unset on Android)
   - **Physical device:** `http://<your-computer-lan-ip>:3000`

The mobile app calls the same `/api/*` routes via `apps/mobile/src/api/client.ts` and stores tokens in **Expo SecureStore**.

Screens: login, register, me (auto-refresh), refresh, logout, account (password / logout-all / delete).

## Layout

- `services/auth/` — auth microservice (API + SQLite)
- `services/gateway/` — gateway microservice (serves demo page + proxies `/api/*` to auth)

### Ports

- Gateway: `localhost:3000`
- Auth service: `localhost:3001`
