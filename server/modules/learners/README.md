# Learners Module

**Purpose**: Manage learners (e.g. Student, Pupil). Links a learner profile to a user record.

**API Endpoints**: 
Standard CRUD on `/api/v1/learners`. `GET` optionally accepts `?page=&pageSize=` (see `server/lib/pagination.js`) — omit both to get every row, exactly as before pagination existed; pass either to get `{data, meta: {total, page, pageSize}}` instead of a plain array.

`GET /api/v1/learners/:id/profile` — an aggregated "insights" view: the learner record (joined with cohort/unit/user email/profile picture), linked guardians, an attendance summary + recent records, exam scores (joined with subject/exam names), and issued certificates. Unlike the rest of this module, **not** gated by `requirePermission('learners.view')` at the route level — see the controller's `getProfile` for why (a learner/guardian without roster access can still view their own/linked child's profile).

**Permissions**: 
Requires authentication plus `learners.view` (GET routes) or `learners.manage` (POST/PUT/DELETE), checked against `onec_role_permissions` for the caller's role — see `server/lib/permissions.js`. `getProfile` is the one exception (see above).

**Class head / school head**: `PATCH /:id/class-head` and `PATCH /:id/school-head` toggle `meta.is_class_head`/`meta.is_school_head` — no new columns or tables, same pattern as `gender`/`designation` living in the existing `meta` JSONB elsewhere in this app. Class head is unrestricted in count (any number of students per cohort can hold it); school head is tenant-wide singular — setting it clears whoever held it before. Both routes require `learners.manage`, but `school-head` layers a narrower in-controller check on top: only `admin` or whoever is tagged `principal` (see `server/lib/designation.js`) may actually set it, even though `learners.manage` is the route-level gate.
