# Guardians Feature (Frontend)

**Purpose**: List and create guardians (Parent/Guardian). Mirrors learners/instructors — creates the linked `onec_users` row inline, in the same form. A "Linked Learners" column plus a `GuardianLinksModal` (link/unlink learners per guardian) is shown to callers with `guardian_links.manage`, backed by `onec_learner_guardian_map` — this is what scopes a guardian's own view of attendance/scores/certificates/activity logs to just their linked children (see `server/lib/rowScope.js`).

**API Endpoints used**: `GET/POST /api/v1/guardians`, `GET/POST /api/v1/guardian-links`, `DELETE /api/v1/guardian-links/:learnerId/:guardianId`.

**Permissions**: server-enforced via `guardians.view`/`guardians.manage` for the roster, and `guardian_links.view`/`guardian_links.manage` for the linking UI — see `server/modules/guardians/README.md` and `server/modules/guardianLinks/README.md`.
