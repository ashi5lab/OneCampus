# Kindergarten Activity Module (Phase 8)

**Purpose**: Daily activity log for kindergarten learners (meal intake, sleep duration, free-text activity tags) — the kindergarten-specific module that first tests the module-toggle system with a genuinely different feature set, per the spec's Phase 8 note.

**API Endpoints**:
- `GET /api/v1/kindergarten-activity` — list, optionally filtered by `?learner_id=` and/or `?date=` (independently, like the attendance module)
- `POST /api/v1/kindergarten-activity` — log/upsert one learner's entry for a date. Upserts by `(learner_id, date)`.

**Permissions**: Requires authentication AND the `kindergarten_activity` module must be enabled in the tenant's `active_modules` (kindergarten tenants only), AND `kindergarten_activity.view` (GET) or `kindergarten_activity.log` (POST), checked against `onec_role_permissions`.

**Business rules**: `logged_by` is always the authenticated user, never accepted from the request body. Same upsert-by-check pattern as `attendance.mark()` — no DB-level unique constraint on `(learner_id, date)`, so there's a small race window under concurrent writes for the same learner+date (pre-existing, documented limitation shared with the attendance module).

**Row-level scoping**: a `learner`-role caller only ever sees their own log entries on `GET` — the `learner_id` filter is forced from their linked `onec_learners` row, overriding `?learner_id=`. In practice a kindergarten-age child won't be the one logging in — this scoping mainly matters once guardian accounts can be linked to a child (`onec_learner_guardian_map` has no backend yet, see `HANDOFF.md`); guardian scoping isn't implemented in this pass.
