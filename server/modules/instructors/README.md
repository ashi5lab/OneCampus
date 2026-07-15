# Instructors Module

**Purpose**: Manage instructors (e.g. Teacher, Professor, Caregiver). Links an instructor profile to a user record.

**API Endpoints**: 
Standard CRUD on `/api/v1/instructors`. `GET` optionally accepts `?page=&pageSize=` (see `server/lib/pagination.js`) — omit both to get every row, exactly as before pagination existed; pass either to get `{data, meta: {total, page, pageSize}}` instead of a plain array.

`GET /api/v1/instructors/:id/profile` — an aggregated "insights" view: the instructor record (joined with user email/profile picture) plus lightweight activity stats (attendance records marked, exam scores graded) and a recent-activity list. Gated the same as the rest of this module (`instructors.view`) — no self-view bypass needed since `instructor` already has `instructors.view` by default.

**Permissions**:
Requires authentication plus `instructors.view` (GET routes) or `instructors.manage` (POST/PUT/DELETE), checked against `onec_role_permissions` for the caller's role. See `server/lib/permissions.js`.
