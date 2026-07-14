# Attendance Module

**Purpose**: Manage learner attendance tracking on a daily or class-by-class basis.

**API Endpoints**: 
- `GET /api/v1/attendance`
- `POST /api/v1/attendance` (Upserts attendance record)

**Permissions**: 
Requires authentication AND the `attendance` module must be enabled in the tenant's `active_modules` configuration.
