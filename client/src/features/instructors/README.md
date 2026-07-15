# Instructors Feature (Frontend)

**Purpose**: List and create instructors (Teacher/Professor/Caregiver, vocabulary-driven). Mirrors the learners feature's structure.

**API Endpoints used**: `GET /api/v1/instructors`, `POST /api/v1/instructors`.

**Business rules**: creating an instructor creates its `onec_users` row (role `instructor`) and `onec_instructors` row together in one transaction — the form collects username/email/password directly, no separate user-creation step needed.

**Known limitation**: no permissions system yet (Phase 7) — any authenticated user can create/edit/delete instructors regardless of role.
