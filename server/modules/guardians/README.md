# Guardians Module

**Purpose**: Manage guardians (e.g. Parent, Guardian). Creates the linked `onec_users` row (role `guardian`) and the `onec_guardians` row together in one transaction, same pattern as learners/instructors — the create form collects username/email/password directly.

**API Endpoints**: 
Standard CRUD on `/api/v1/guardians`. `GET` optionally accepts `?page=&pageSize=` (see `server/lib/pagination.js`) — omit both to get every row, exactly as before pagination existed; pass either to get `{data, meta: {total, page, pageSize}}` instead of a plain array.

`GET /api/v1/guardians/:id/profile` — the aggregated profile-page view: the guardian's own details plus every learner linked to them via `onec_learner_guardian_map` (id/name/registry_no/status/cohort_name/profile_picture_url). Not gated by `guardians.view` — see Permissions below.

**Permissions**:
Requires authentication plus `guardians.view` (GET routes) or `guardians.manage` (POST/PUT/DELETE), checked against `onec_role_permissions` for the caller's role. See `server/lib/permissions.js`.

`GET /:id/profile` is unguarded at the route level and self-scopes instead: callers with `guardians.view` can view any guardian; a `guardian`-role caller can view their own; anyone else (e.g. a `learner`) can view it only if the guardian is linked to one of their own scoped learner ids (`server/lib/rowScope.js`) — i.e. a learner can open their own guardian's profile from their student profile page, but not an arbitrary guardian's.
