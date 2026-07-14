# Instructors Module

**Purpose**: Manage instructors (e.g. Teacher, Professor, Caregiver). Links an instructor profile to a user record.

**API Endpoints**: 
Standard CRUD on `/api/v1/instructors`

**Permissions**:
Requires authentication plus `instructors.view` (GET routes) or `instructors.manage` (POST/PUT/DELETE), checked against `onec_role_permissions` for the caller's role. See `server/lib/permissions.js`.
