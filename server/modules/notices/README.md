# Notices Module

**Purpose**: School-wide announcements / a notice board. A **core** feature (not gated by a module toggle like `attendance`/`exams`/`messaging`) — every institution type wants a notice board, unlike e.g. `kindergarten_activity`, which is genuinely specific to one org type.

**API Endpoints**:
- `GET /api/v1/notices` — for `admin`/`staff`, every notice (they manage the board, so they need full visibility). For every other role, only notices with `audience = 'all'` or `audience` matching their own group (`instructor` → `'instructors'`, `learner` → `'learners'`, `guardian` → `'guardians'`).
- `POST /api/v1/notices` — `{ title, body, audience? }`. `audience` defaults to `'all'`; must be one of `'all' | 'instructors' | 'learners' | 'guardians'`.
- `PUT /api/v1/notices/:id`, `DELETE /api/v1/notices/:id`.

**Permissions**: `notices.view` (everyone, by default) / `notices.manage` (admin/staff only, by default) — same admin/staff-side-action pattern as `certificates.issue`. `instructor`/`learner`/`guardian` can read the board but not post to it in v1.

**Business Rules**:
- No row-level scoping needed beyond the audience filter above — a notice isn't tied to a specific learner/cohort, just a broad role-group target.
- No expiry/scheduling, no per-cohort targeting, no read receipts — a flat list ordered newest-first, v1.
