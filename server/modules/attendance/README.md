# Attendance Module

**Purpose**: Manage learner attendance tracking on a daily or class-by-class basis.

**API Endpoints**: 
- `GET /api/v1/attendance`
- `POST /api/v1/attendance` (Upserts attendance record)

**Permissions**:
Requires authentication AND the `attendance` module must be enabled in the tenant's `active_modules` configuration, AND `attendance.view` (GET) or `attendance.mark` (POST), checked against `onec_role_permissions` for the caller's role.

**Row-level scoping**: a `learner`-role caller only ever sees their own records on `GET` — the `learner_id` filter is forced from their linked `onec_learners` row (via `lib/ownLearner.js`), overriding any `?cohort_id=`/`?date=` query params rather than being combined with them as an option. Other roles (admin/staff/instructor) are unscoped.
