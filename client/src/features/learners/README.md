# Learners Feature (Frontend)

**Purpose**: List and create learners. First fully-wired vertical slice (API → React Query → form → table) — the reference pattern for building out instructors/cohorts/attendance screens next.

**API Endpoints used**: `GET /api/v1/learners`, `POST /api/v1/learners`.

**Business rules**: creating a learner creates its `onec_users` row (role `learner`) and `onec_learners` row together in one transaction — the form collects username/email/password directly, no separate user-creation step needed.

**Known limitation**: no permissions system yet (Phase 7) — any authenticated user can create/edit/delete learners regardless of role.
