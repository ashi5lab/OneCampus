# Auth Feature (Frontend)

**Purpose**: Login screen and session handling. Talks to `AuthContext`, which wraps `POST /api/v1/auth/login` and persists the token/user to `localStorage`.

**Business rules**: Unauthenticated visits to a protected route redirect here, and log back in returns the user to wherever they were headed (`ProtectedRoute` + `location.state.from`).
