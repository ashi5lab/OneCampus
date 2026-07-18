# Staff Attendance Module

**Purpose**: Daily attendance for instructors and staff themselves — `onec_attendance` (see `server/modules/attendance`) is learner-only and has no concept of a non-learner user, so this is a separate table/module rather than an overload of that one.

**API Endpoints**:
- `GET /api/v1/staff-attendance/mine` — the caller's own attendance history. Requires `staff_attendance.view_own`.
- `GET /api/v1/staff-attendance?date=&staff_role=&roster_id=` — roster-wide view, all filters independently optional. Requires `staff_attendance.view`.
- `POST /api/v1/staff-attendance` — `{ staff_role, roster_id, date, status, remarks }`, upserts on `(staff_role, roster_id, date)`. Requires `staff_attendance.mark`. `roster_id` is the `onec_instructors.id`/`onec_staff.id` row itself (whichever `staff_role` says), not a `onec_users.id` — see Business rules below for why.

**Permissions**: `staff_attendance.view` + `staff_attendance.mark` (admin/staff — mirrors `leave.approve`'s admin/staff-only default), `staff_attendance.view_own` (admin/staff/instructor — self-service, mirrors `leave.view_own`). A plain instructor can see their own attendance history but not mark anyone's, including their own — marking is an admin/staff (HR-side) action, same split as the leave module's apply-vs-approve separation.

**Business rules**:
- `status` uses the same vocabulary as `onec_attendance`: `present` | `absent` | `late` | `excused`.
- **Keyed on the roster row (`onec_instructors.id`/`onec_staff.id`), not `user_id`.** `onec_instructors.user_id`/`onec_staff.user_id` are both nullable — a bulk-uploaded instructor/staff member commonly has no login account at all (see `server/modules/bulkUpload`'s all-or-nothing login fields), but still needs to show up on the attendance roster and be markable. `staff_role` disambiguates which of the two roster tables `roster_id` resolves to, the same pattern `onec_leave_requests.applicant_role` uses. `user_id` is still stored on each row (nullable) purely so `GET /mine` has something to filter by for whoever *does* have a login — someone without one can't log in to use self-view anyway, so this only matters for people it's actually reachable for.
- Upsert is a plain `INSERT ... ON CONFLICT (staff_role, roster_id, date) DO UPDATE`, unlike `onec_attendance`'s manual check-then-write — that table's unique constraint includes a nullable `allocation_id` column (NULL ≠ NULL breaks a naive `ON CONFLICT`), which doesn't apply here since none of `(staff_role, roster_id, date)` is nullable.

**Known limitations (v1)**:
- No roster-listing endpoint here — the frontend combines the existing `GET /instructors` and `GET /staff` lists to build the "who can be marked" roster, rather than duplicating that data.
- No automatic tie-in to approved leave (`server/modules/leave`) yet — an approved leave day doesn't auto-mark attendance as `excused`. That's covered separately by the substitute-teacher workflow follow-up, not this module.
