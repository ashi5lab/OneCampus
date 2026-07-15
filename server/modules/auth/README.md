# Auth Module

**Purpose**: Handles user authentication, short-lived access tokens, httpOnly-cookie refresh tokens (with rotation), and CSRF protection for the cookie-authenticated endpoints.

**API Endpoints**:
- `POST /api/v1/auth/login`
  - Body: `{ "username": "...", "password": "..." }`
  - Returns: `{ "data": { "token": "...", "csrfToken": "...", "user": { ... } } }`. Also sets two cookies: `refreshToken` (httpOnly, path-scoped to `/api/v1/auth`) and `csrfToken` (readable by JS on purpose — see below).
- `POST /api/v1/auth/refresh` — trades the `refreshToken` cookie for a new access token, rotating the refresh token in the same call (old one revoked, new one issued — single-use). No Bearer token needed; requires the CSRF double-submit header (see below). Returns the same shape as login.
- `POST /api/v1/auth/logout` — revokes the current refresh token and clears both cookies. Also CSRF-protected.
- `GET /api/v1/auth/me` — returns `{ data: { userId, role, permissions: [...] } }` for the caller's own role, read live from `onec_role_permissions`. This is what the frontend uses to hide/disable UI a role can't use (see `client/src/contexts/AuthContext.jsx`) instead of hardcoding a copy of the permission matrix that could drift from a tenant's actual (possibly customized) permissions.

**Permissions**:
- `POST /login` is publicly accessible; resolves tenant context first to check credentials against the correct schema.
- `POST /refresh` and `POST /logout` don't use the `auth` middleware (Bearer token) at all — the entire point of refresh is to work when the access token has already expired. Instead they're protected by `server/middleware/csrf.js`'s double-submit check: the request must echo the `csrfToken` cookie's value back as an `x-csrf-token` header, or it's rejected (403) before the refresh-token cookie is even looked at.
- `GET /me` requires a valid JWT (just `auth`, no specific permission — every authenticated user can see their own permission set).

**Business Rules**:
- Verifies password against hashed password in `onec_users` using `bcrypt`.
- Access token: JWT, `ACCESS_TOKEN_TTL` (default `15m`, see `server/config/env.js`), contains `userId`, `role`, `tenant`.
- Refresh token: opaque random value (not a JWT — revocation is just deleting/marking a DB row, no second signing secret to manage), `REFRESH_TOKEN_TTL_DAYS` (default `7`). Only its SHA-256 hash is stored in `onec_refresh_tokens` (mirrors `password_hash`'s principle — a DB leak alone doesn't yield a usable token). See `server/lib/refreshTokens.js`.
- **Rotation, not reuse**: every successful `/refresh` call revokes the token it was given and issues a brand new one. Replaying an already-used refresh token fails (401) — this bounds the damage of a leaked refresh token to a single use before it's caught (the legitimate client's next refresh attempt will also fail, since its token was already rotated out from under it — a real signal something is wrong, not silently tolerated).
- CORS must echo the frontend's exact origin (`CLIENT_ORIGIN`, default `http://localhost:5173`) with `credentials: true` — browsers reject `Access-Control-Allow-Origin: *` on any request that carries cookies, which every request against this API now does (see `client/src/lib/apiClient.js`'s `credentials: 'include'`).
- Rate-limited: 10 attempts per 15 minutes, keyed by tenant + IP (`server/middleware/rateLimiters.js`) — a burst against one tenant doesn't block a different tenant sharing the same IP. Only applies to `/login`, not `/refresh`/`/logout`.
