# Staff Module

**Purpose**: roster/CRUD for `role='staff'` accounts (front-office/admin-support), backed by its own `onec_staff` table — deliberately not `onec_instructors`, since a staff member isn't a teacher and shouldn't appear anywhere instructors do (grading rosters, allocations, etc). Mirrors `server/modules/instructors` almost exactly (same shape: `staff_id`, name, phone, `meta` JSONB) since the two are structurally identical minus the role value.

**Why this exists**: the `staff` role has existed in `lib/permissions.js` since early in the project, but there was never any UI/API path to actually create a `staff`-role user — only `admin` (bootstrap), `instructor`/`learner`/`guardian` (their own roster modules) had one. This module closes that gap and, alongside it, `staff`'s default permission set was narrowed from "everything except a couple of admin-only powers" down to just messages + notices (see `lib/permissions.js`'s comment on `DEFAULT_ROLE_PERMISSIONS.staff`) — broader per-tenant access is meant to come from `server/modules/accessControl`'s access groups now, not a hardcoded role default.

**API Endpoints**: `GET /api/v1/staff` (`?search=&gender=`, same filter shape as instructors), `POST /api/v1/staff`, `PUT /api/v1/staff/:id`, `DELETE /api/v1/staff/:id`.

**Permissions**: `staff.view` / `staff.manage` — **admin only** by default (same reasoning as `users.manage_passwords`: creating accounts is a sensitive, tenant-wide-impact action).
