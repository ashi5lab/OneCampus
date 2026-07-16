# Access Control Module

**Purpose**: lets an admin grant permissions beyond a role's default without a code change or editing raw `onec_role_permissions` rows by hand — named "access groups" that bundle a set of permissions and apply either to every user of a role, or to an explicit set of individual users. Additive only: a group can only grant permissions on top of whatever a user's role already has, never take any away (there's no "deny" concept here — removing access still means deleting/editing the underlying `onec_role_permissions` rows, same as before this module existed).

**Data model** (`onec_access_groups` + `onec_access_group_members`):
- `permissions` — JSONB array of permission strings (validated server-side against `lib/permissions.js`'s `ALL_PERMISSIONS`).
- `target_type` — `'role'` (applies to every user currently holding `target_role`) or `'users'` (applies only to the specific users in `onec_access_group_members`).
- Membership is fully replaced on every update (delete-all-then-reinsert) rather than diffed — simpler, and group sizes here are expected to be small (individual staff members, not bulk rosters).

**How it's enforced**: `lib/permissions.js`'s `hasPermission()`/`getPermissionsForRole()` — used by every `requirePermission()` check and by `GET /auth/me` — now run a `UNION` of the caller's role permissions with every access group that applies to them, instead of just the role table. Every existing `requirePermission('x.y')` call across the whole app picks this up automatically; nothing else needed to change.

**Deploy-order safety**: that `UNION` query references `onec_access_groups`/`onec_access_group_members`, which won't exist on a tenant until migration `015` runs. Since `hasPermission` gates nearly every request in the app, letting it throw on a missing table would break every protected route tenant-wide the moment this code deploys — instead, a Postgres `42P01` (undefined_table) error falls back to the original role-only query, so an unmigrated tenant just doesn't have Access Control yet rather than losing the whole app.

**API Endpoints** (all gated by `access_control.manage`, **admin only** by default — this module controls the permission system itself, so it's treated the same as `users.manage_passwords`/`broadcast.configure`):
- `GET /api/v1/access-control/groups` — every group plus its resolved member list (for `target_type='users'` groups).
- `POST /api/v1/access-control/groups` / `PUT /api/v1/access-control/groups/:id` / `DELETE /api/v1/access-control/groups/:id`.
- `GET /api/v1/access-control/users` — picker for `target_type='users'`.
- `GET /api/v1/access-control/permissions` — the full `ALL_PERMISSIONS` list, for the UI's checkbox grid.

**Known gap**: a handful of controllers (library/notices/assignments/onlineExams) have `isManager = role === 'admin' || role === 'staff'`-style shortcuts for row-scoping decisions (e.g. "show every loan" vs. "show only mine"), checked directly against the literal role string rather than through `hasPermission()`. A `staff` user granted a narrower permission via an access group (e.g. just `library.view`, not `.manage`) still trips those literal-role shortcuts and gets manager-level scoping in list results, not just the permission they were actually granted. Not a privilege-escalation issue — the outer `requirePermission()` gate on each route still blocks anyone without the real permission — just an over-broad *scoping* result in a few list endpoints for staff users given narrower-than-full access this way. Reworking those checks to go through `hasPermission()` instead of a literal role comparison would close this properly; out of scope for this pass.
