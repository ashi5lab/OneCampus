# Learners Feature (Frontend)

**Purpose**: List and create learners. First fully-wired vertical slice (API → React Query → form → table) — the reference pattern for building out instructors/cohorts/attendance screens next.

**API Endpoints used**: `GET /api/v1/learners`, `POST /api/v1/learners`.

**Known limitation**: creating a learner requires an existing `onec_users` row id — there's no user-creation UI yet, so this only works with users seeded via `server/scripts/seedTestUser.js` or created directly. Wiring up user creation is follow-up work.
