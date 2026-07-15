# Cohorts Module

**Purpose**: Manage cohorts (e.g. Class, Course Section, Playgroup).

**API Endpoints**: 
Standard CRUD on `/api/v1/cohorts`. `GET` optionally accepts `?page=&pageSize=` (see `server/lib/pagination.js`) — omit both to get every row, exactly as before pagination existed; pass either to get `{data, meta: {total, page, pageSize}}` instead of a plain array.

**Permissions**:
Requires authentication plus `cohorts.view` (GET routes) or `cohorts.manage` (POST/PUT/DELETE), checked against `onec_role_permissions` for the caller's role. See `server/lib/permissions.js`.
