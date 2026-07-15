# Guardians Module

**Purpose**: Manage guardians (e.g. Parent, Guardian). Links a guardian profile to a user record.

**API Endpoints**: 
Standard CRUD on `/api/v1/guardians`

**Permissions**:
Requires authentication plus `guardians.view` (GET routes) or `guardians.manage` (POST/PUT/DELETE), checked against `onec_role_permissions` for the caller's role. See `server/lib/permissions.js`.
