# Auth Module

**Purpose**: Handles user authentication, token generation, and password verification.

**API Endpoints**:
- `POST /api/v1/auth/login`
  - Body: `{ "username": "...", "password": "..." }`
  - Returns: `{ "data": { "token": "...", "user": { ... } } }`
- `GET /api/v1/auth/me` — returns `{ data: { userId, role, permissions: [...] } }` for the caller's own role, read live from `onec_role_permissions`. This is what the frontend uses to hide/disable UI a role can't use (see `client/src/contexts/AuthContext.jsx`) instead of hardcoding a copy of the permission matrix that could drift from a tenant's actual (possibly customized) permissions.

**Permissions**:
- `POST /login` is publicly accessible (no authentication required to attempt login); resolves tenant context first to check credentials against the correct schema.
- `GET /me` requires a valid JWT (just `auth`, no specific permission — every authenticated user can see their own permission set).

**Business Rules**:
- Verifies password against hashed password in `onec_users` using `bcrypt`.
- Generates a short-lived JWT that contains `userId`, `role`, and `tenant`.
- Rate-limited: 10 attempts per 15 minutes, keyed by tenant + IP (`server/middleware/rateLimiters.js`) — a burst against one tenant doesn't block a different tenant sharing the same IP.
