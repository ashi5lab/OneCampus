# Instructors Feature (Frontend)

**Purpose**: List and create instructors (Teacher/Professor/Caregiver, vocabulary-driven). Mirrors the learners feature's structure.

**API Endpoints used**: `GET /api/v1/instructors`, `POST /api/v1/instructors`.

**Business rules**: creating an instructor creates its `onec_users` row (role `instructor`) and `onec_instructors` row together in one transaction — the form collects username/email/password directly, no separate user-creation step needed.

**Permissions**: server-enforced via `instructors.view`/`instructors.manage` (see `server/modules/instructors/README.md`) — a `403` from the API surfaces as `submitError` in the form/page, but there's no UI-level hiding of the "+ Add" button for roles that lack `instructors.manage` yet.
