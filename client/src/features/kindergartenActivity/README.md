# Kindergarten Activity Feature (Frontend)

**Purpose**: List and log daily kindergarten activity entries (meal intake, sleep duration, free-text activities) per learner.

**API Endpoints used**: `GET /api/v1/kindergarten-activity`, `POST /api/v1/kindergarten-activity` (upserts by learner + date).

**Permissions**: server-enforced via `kindergarten_activity.view`/`kindergarten_activity.log`, gated by the `kindergarten_activity` module toggle (kindergarten tenants only) — see `server/modules/kindergartenActivity/README.md`.
