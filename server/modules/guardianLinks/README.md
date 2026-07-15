# Guardian Links Module

**Purpose**: Manage the many-to-many mapping between learners and their guardians (`onec_learner_guardian_map`), which powers row-level scoping for the `guardian` role — see `server/lib/ownGuardianLearners.js` and `server/lib/rowScope.js`. A guardian only sees attendance/scores/certificates/kindergarten-activity for learners they're linked to here.

**API Endpoints**:
- `GET /api/v1/guardian-links?learner_id=&guardian_id=` — list links, optionally filtered. A caller with the `guardian` role is force-scoped to their own `guardian_id` regardless of query params.
- `POST /api/v1/guardian-links` — create a link (`{ learner_id, guardian_id }`). Idempotent — linking an already-linked pair returns the existing row instead of erroring.
- `DELETE /api/v1/guardian-links/:learnerId/:guardianId` — remove a link.

**Permissions**:
Requires authentication plus `guardian_links.view` (GET) or `guardian_links.manage` (POST/DELETE), checked against `onec_role_permissions`. Linking/unlinking is staff-side only — guardians get `.view` but not `.manage` by default (see `server/lib/permissions.js`).
