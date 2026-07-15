# Units Feature (Frontend)

**Purpose**: List and create structural units (Department/Faculty/Wing). Mirrors the cohorts feature's structure — the simplest of the CRUD features, no linked-user-creation complexity like learners/instructors/guardians.

**API Endpoints used**: `GET /api/v1/units`, `POST /api/v1/units`.

**Known limitation**: `head_user_id` isn't collected in the create form (left null) — no user picker exists yet to select one.

**Permissions**: server-enforced via `units.view`/`units.manage` — see `server/modules/units/README.md`.
