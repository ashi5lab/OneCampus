# Units Module

**Purpose**: Manage structural units (e.g. Department, Faculty, Wing).

**API Endpoints**: 
Standard CRUD on `/api/v1/units`. `GET` optionally accepts `?page=&pageSize=` (see `server/lib/pagination.js`) — omit both to get every row, exactly as before pagination existed; pass either to get `{data, meta: {total, page, pageSize}}` instead of a plain array.

**Permissions**:
Requires authentication plus `units.view` (GET routes) or `units.manage` (POST/PUT/DELETE), checked against `onec_role_permissions` for the caller's role. See `server/lib/permissions.js`.
