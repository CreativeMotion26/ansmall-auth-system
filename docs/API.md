# API reference

Authentication API for **ansmall-auth-system**. All JSON endpoints use `Content-Type: application/json`.

## Base URLs

| Environment | URL | Notes |
|-------------|-----|-------|
| Gateway (recommended) | `http://localhost:3000` | Serves the demo UI and proxies `/api/*` to auth |
| Auth service (direct) | `http://localhost:3001` | API only |

Mobile and web clients should call the **gateway** URL in development unless you configure otherwise.

## Authentication model

The API uses a **two-token** flow:

1. **Access token** — JWT, short-lived (15 minutes). Send on protected routes:
   ```
   Authorization: Bearer <accessToken>
   ```
2. **Refresh token** — Opaque random string (64 hex chars). Only a SHA-256 hash is stored server-side. Used to obtain new tokens via `POST /api/refresh`. Each refresh **rotates** the refresh token (the old one stops working).

```
┌─────────┐   register/login    ┌──────────────┐
│ Client  │ ──────────────────► │ accessToken  │  (JWT, ~15 min)
│         │                     │ refreshToken │  (opaque, ~7 days)
└─────────┘                     └──────────────┘
     │                                   │
     │  GET /api/me (Bearer access)      │
     │ ─────────────────────────────────►│
     │                                   │
     │  POST /api/refresh (refresh)      │
     │ ─────────────────────────────────►│ new access + new refresh
     │                                   │
     │  POST /api/logout (refresh)       │
     │ ─────────────────────────────────►│ refresh revoked
```

### Token bundle (register, login, refresh)

Successful `POST /api/register`, `POST /api/login`, and `POST /api/refresh` return:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "a1b2c3d4e5f6...",
  "expiresIn": 900,
  "user": {
    "id": 1,
    "email": "you@example.com"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `accessToken` | string | JWT for `Authorization: Bearer` |
| `refreshToken` | string | Opaque token; store securely and send only to `/api/refresh` or `/api/logout` |
| `expiresIn` | number | Access token lifetime in **seconds** (default `900` = 15 minutes) |
| `user.id` | number | Numeric user id |
| `user.email` | string | Normalized lowercase email |

### Error responses

Most errors return JSON with a single `error` string:

```json
{ "error": "Invalid email or password" }
```

| Status | Meaning |
|--------|---------|
| `400` | Invalid request body or validation failed |
| `401` | Missing/invalid token or wrong credentials |
| `409` | Conflict (e.g. email already registered) |
| `429` | Rate limit exceeded |

Rate limit (register, login, refresh): **50 requests per 15 minutes** per IP.

---

## Endpoints

### `GET /api/health`

Health check. No authentication.

**Response `200`**

```json
{
  "status": "ok",
  "service": "auth"
}
```

---

### `POST /api/register`

Create a new account and return tokens.

**Request body**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `email` | string | yes | Valid email, 3–254 chars after trim; stored lowercase |
| `password` | string | yes | Minimum 8 characters |

**Example**

```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"secretpass"}'
```

**Responses**

| Status | Body |
|--------|------|
| `201` | Token bundle |
| `400` | `{ "error": "Invalid email" }` or password too short |
| `409` | `{ "error": "Email already registered" }` |
| `429` | `{ "error": "Too many attempts, try again later" }` |

---

### `POST /api/login`

Sign in with email and password. Returns a new token bundle (new refresh token row).

**Request body**

Same as register: `{ "email", "password" }`.

**Example**

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"secretpass"}'
```

**Responses**

| Status | Body |
|--------|------|
| `200` | Token bundle |
| `400` | `{ "error": "Invalid email or password" }` |
| `401` | `{ "error": "Invalid email or password" }` |
| `429` | Rate limit error |

---

### `POST /api/refresh`

Exchange a valid refresh token for a new access token and a **new** refresh token. The submitted refresh token is invalidated (rotation).

**Request body**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `refreshToken` | string | yes | Minimum 16 characters |

**Example**

```bash
curl -X POST http://localhost:3000/api/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<your-refresh-token>"}'
```

**Responses**

| Status | Body |
|--------|------|
| `200` | Token bundle |
| `400` | `{ "error": "refreshToken required" }` |
| `401` | `{ "error": "Invalid or expired refresh token" }` or `{ "error": "User not found" }` |
| `429` | Rate limit error |

---

### `POST /api/logout`

Revoke a single refresh token. Does **not** invalidate the access JWT until it expires naturally.

**Request body**

```json
{ "refreshToken": "<refresh-token-to-revoke>" }
```

**Example**

```bash
curl -X POST http://localhost:3000/api/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<your-refresh-token>"}'
```

**Response `200`**

```json
{ "message": "Refresh token revoked" }
```

Always returns success if the body is valid, even if the token was already revoked.

---

### `POST /api/logout-all`

Revoke **all** refresh tokens for the authenticated user. Requires access token.

**Headers**

```
Authorization: Bearer <accessToken>
```

**Example**

```bash
curl -X POST http://localhost:3000/api/logout-all \
  -H "Authorization: Bearer <accessToken>"
```

**Response `200`**

```json
{
  "message": "All refresh tokens revoked",
  "revoked": 3
}
```

| Field | Type | Description |
|-------|------|-------------|
| `revoked` | number | Count of refresh token rows deleted |

**Responses**

| Status | Body |
|--------|------|
| `401` | Missing/invalid Bearer token |

---

### `GET /api/me`

Return the current user from the access JWT.

**Headers**

```
Authorization: Bearer <accessToken>
```

**Example**

```bash
curl http://localhost:3000/api/me \
  -H "Authorization: Bearer <accessToken>"
```

**Response `200`**

```json
{
  "user": {
    "id": 1,
    "email": "you@example.com"
  }
}
```

**Responses**

| Status | Body |
|--------|------|
| `401` | `{ "error": "Missing or invalid Authorization header" }`, invalid/expired JWT, or user not found |

---

### `PATCH /api/me/password`

Change password for the authenticated user. Revokes all refresh tokens so other devices must sign in again.

**Headers**

```
Authorization: Bearer <accessToken>
```

**Request body**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `currentPassword` | string | yes | Must match existing password |
| `newPassword` | string | yes | Minimum 8 characters |

**Example**

```bash
curl -X PATCH http://localhost:3000/api/me/password \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"oldpass12","newPassword":"newpass12"}'
```

**Response `200`**

```json
{ "message": "Password updated; sign in again on other devices" }
```

**Responses**

| Status | Body |
|--------|------|
| `400` | Missing or invalid fields |
| `401` | Wrong current password or invalid token |

---

### `DELETE /api/me`

Permanently delete the authenticated account and all associated refresh tokens.

**Headers**

```
Authorization: Bearer <accessToken>
```

**Request body**

| Field | Type | Required |
|-------|------|----------|
| `password` | string | yes |

**Example**

```bash
curl -X DELETE http://localhost:3000/api/me \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"password":"secretpass"}'
```

**Response `200`**

```json
{ "message": "Account deleted" }
```

**Responses**

| Status | Body |
|--------|------|
| `400` | `{ "error": "password required to delete account" }` |
| `401` | Wrong password or invalid token |

---

## OpenAPI

Machine-readable spec: [`openapi.yaml`](./openapi.yaml).

You can import it into [Swagger Editor](https://editor.swagger.io/) or generate clients with [openapi-generator](https://openapi-generator.tech/).

## Security notes (learning project)

- Set `ACCESS_TOKEN_SECRET` in production (see `.env.example`).
- Storing refresh tokens in `localStorage` is acceptable for learning; production apps often use `httpOnly` cookies for refresh tokens to reduce XSS risk.
- Access tokens are stateless JWTs; logout endpoints only revoke refresh tokens.
