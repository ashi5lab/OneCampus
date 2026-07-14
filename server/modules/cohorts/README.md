# Cohorts Module

**Purpose**: Manage cohorts (e.g. Class, Course Section, Playgroup).

**API Endpoints**: 
Standard CRUD on `/api/v1/cohorts`

**Permissions**:
Requires authentication plus `cohorts.view` (GET routes) or `cohorts.manage` (POST/PUT/DELETE), checked against `onec_role_permissions` for the caller's role. See `server/lib/permissions.js`.
