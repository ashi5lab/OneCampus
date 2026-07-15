# Auth Feature (Frontend)

**Purpose**: Login screen and session handling. Talks to `AuthContext`.

**Business rules**:
- Nothing is persisted to `localStorage` — the only durable session state is the httpOnly `refreshToken` cookie the browser holds automatically. On mount, `AuthContext` silently calls `POST /api/v1/auth/refresh` to try to restore a session from that cookie; if it fails (no cookie, or it's expired/revoked), the user just sees the login page, same as never having logged in. `ProtectedRoute` waits on this (`initializing` flag) before deciding whether to redirect — otherwise every page reload would flash to `/login` before the restore attempt even finished.
- `apiClient.js`'s `request()` auto-retries a `401` once by calling `/auth/refresh` and replaying the original request with the new access token — components don't need to handle token expiry themselves. Concurrent 401s share one in-flight refresh call (`refreshPromise` in `apiClient.js`) rather than each independently racing to rotate the single-use refresh token.
- The CSRF token used on `/auth/refresh` and `/auth/logout` is read directly from the (non-httpOnly) `csrfToken` cookie at call time via `document.cookie` — **not** cached in a JS variable. That was a real bug found while building this: a cached value goes stale on every page reload (JS module state resets, the cookie doesn't), so the very first refresh-on-mount call always failed.
- Unauthenticated visits to a protected route redirect here, and logging back in returns the user to wherever they were headed (`ProtectedRoute` + `location.state.from`).
