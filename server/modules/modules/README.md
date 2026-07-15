# Modules Module

**Purpose**: Manage educational modules (e.g. Subject, Course, Activity). Note that this is named 'modules' to match the database table, but in the UI it resolves to Subject/Course depending on the vocabulary.

**API Endpoints**: 
Standard CRUD on `/api/v1/modules`

**Permissions**:
Requires authentication plus `modules.view` (GET routes) or `modules.manage` (POST/PUT/DELETE), checked against `onec_role_permissions` for the caller's role. See `server/lib/permissions.js`.
