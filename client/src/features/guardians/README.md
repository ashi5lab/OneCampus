# Guardians Feature (Frontend)

**Purpose**: List and create guardians (Parent/Guardian). Mirrors learners/instructors — creates the linked `onec_users` row inline, in the same form.

**API Endpoints used**: `GET /api/v1/guardians`, `POST /api/v1/guardians`.

**Known limitation**: no UI yet to link a guardian to a learner (`onec_learner_guardian_map` has no frontend at all).

**Permissions**: server-enforced via `guardians.view`/`guardians.manage` — see `server/modules/guardians/README.md`.
