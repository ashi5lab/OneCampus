# Auth Module

**Purpose**: Handles user authentication, token generation, and password verification.

**API Endpoints**:
- `POST /api/v1/auth/login`
  - Body: `{ "username": "...", "password": "..." }`
  - Returns: `{ "data": { "token": "...", "user": { ... } } }`

**Permissions**:
- Publicly accessible (no authentication required to attempt login).
- Resolves tenant context first to check credentials against the correct schema.

**Business Rules**:
- Verifies password against hashed password in `onec_users` using `bcrypt`.
- Generates a short-lived JWT that contains `userId`, `role`, and `tenant`.
- Rate-limited: 10 attempts per 15 minutes, keyed by tenant + IP (`server/middleware/rateLimiters.js`) — a burst against one tenant doesn't block a different tenant sharing the same IP.
