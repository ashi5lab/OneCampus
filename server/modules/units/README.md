# Units Module

**Purpose**: Manage structural units (e.g. Department, Faculty, Wing).

**API Endpoints**: 
Standard CRUD on `/api/v1/units`

**Permissions**:
Requires authentication plus `units.view` (GET routes) or `units.manage` (POST/PUT/DELETE), checked against `onec_role_permissions` for the caller's role. See `server/lib/permissions.js`.
