# Attendance Feature (Frontend)

**Purpose**: Mark and review attendance. `AttendanceRoster` lets an instructor/admin pick a cohort + date, see that cohort's roster (learners filtered client-side by `cohort_id`, no server-side filter exists for that yet), set each learner's status, and "Save All" — which fires one upsert `POST /api/v1/attendance` per learner. A read-only `History` table below shows every record.

**API Endpoints used**: `GET /api/v1/attendance`, `GET /api/v1/attendance?cohort_id=&date=`, `POST /api/v1/attendance`.

**Permissions**: server-enforced via `attendance.view`/`attendance.mark` — a role without `attendance.mark` will get a 403 surfaced as `saveError` on clicking "Save All"; the button itself isn't hidden yet (see HANDOFF.md's frontend-permission-awareness gap).
