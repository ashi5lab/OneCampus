# Discipline Module

**Purpose**: Incident/behavior records per learner — not purely punitive; `severity` includes `positive` for recognizing good behavior, not just demerits.

**API Endpoints**:
- `GET /api/v1/discipline?learner_id=&severity=` — both filters independently optional. Requires `discipline.view`.
- `POST /api/v1/discipline` — `{ learner_id, incident_date, severity, description, action_taken? }`, `severity` is `minor` | `major` | `positive`. Requires `discipline.log`.
- `DELETE /api/v1/discipline/:id` — for correcting a logging mistake (wrong learner, duplicate entry). Requires `discipline.log` — same permission as creating, no separate `.manage` tier, unlike `certificates`'s intentionally-immutable records.

**Permissions**: `discipline.view` (admin/staff/instructor for the roster-wide view; also granted to `learner`/`guardian`, row-scoped to their own/linked children's records — same pattern as `attendance.view`/`certificates.view`), `discipline.log` (admin/staff/instructor).

**Business Rules**:
- `severity` has no numeric weight or escalation logic (e.g. "3 majors auto-triggers X") — it's a plain categorical tag for filtering/display. Building consequences on top of a count is a real school policy decision that varies per institution; this only records what happened.
- `incident_date` is a separate field from `created_at` — an incident can be logged after the fact (e.g. entered the next morning), and reporting should reflect when it actually happened, not when it was typed in.

**Row-level scoping**: `GET /` scopes a `learner`-role caller to only their own records, and a `guardian`-role caller to their linked children's (`lib/rowScope.js`'s `getScopedLearnerIds`, same as `attendance`/`kindergarten_activity`/`certificates`).
