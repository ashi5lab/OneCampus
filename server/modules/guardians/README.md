# Guardians Module

**Purpose**: Manage guardians (e.g. Parent, Guardian). Creates the linked `onec_users` row (role `guardian`) and the `onec_guardians` row together in one transaction, same pattern as learners/instructors — the create form collects username/email/password directly.

**API Endpoints**: 
Standard CRUD on `/api/v1/guardians`

**Permissions**:
Requires authentication plus `guardians.view` (GET routes) or `guardians.manage` (POST/PUT/DELETE), checked against `onec_role_permissions` for the caller's role. See `server/lib/permissions.js`.
