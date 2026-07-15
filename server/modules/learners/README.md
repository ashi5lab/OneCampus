# Learners Module

**Purpose**: Manage learners (e.g. Student, Pupil). Links a learner profile to a user record.

**API Endpoints**: 
Standard CRUD on `/api/v1/learners`. `GET` optionally accepts `?page=&pageSize=` (see `server/lib/pagination.js`) — omit both to get every row, exactly as before pagination existed; pass either to get `{data, meta: {total, page, pageSize}}` instead of a plain array.

**Permissions**: 
Requires authentication. Role-based permissions to be added in Phase 7.
