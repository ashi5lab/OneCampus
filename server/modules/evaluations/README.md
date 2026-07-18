# Evaluations Module

**Purpose**: Manage exams/assessments (`onec_evaluations`), their per-module schedules (`onec_evaluation_schedules`), and learner scores (`onec_learner_scores`). Covers Phase 5 of the build plan (exams/evaluations + learner scores).

**API Endpoints**:
- `GET /api/v1/evaluations` — list evaluations
- `POST /api/v1/evaluations` — create an evaluation (e.g. "Midterm 2026", type `exam`/`activity_log`/`project`)
- `GET /api/v1/evaluations/:id`
- `PUT /api/v1/evaluations/:id`
- `DELETE /api/v1/evaluations/:id`
- `GET /api/v1/evaluations/:evaluationId/schedules` — schedules (module + date + score range) for an evaluation
- `POST /api/v1/evaluations/:evaluationId/schedules`
- `PUT /api/v1/evaluations/schedules/:scheduleId`
- `DELETE /api/v1/evaluations/schedules/:scheduleId`
- `GET /api/v1/evaluations/schedules/:scheduleId/scores` — learner scores for a schedule
- `POST /api/v1/evaluations/schedules/:scheduleId/scores` — record/update one learner's score (upsert on `eval_schedule_id` + `learner_id`)
- `GET /api/v1/evaluations/:evaluationId/report-card/:learnerId` — one learner's report card for one evaluation: every scheduled subject's score/percentage/grade, an overall total/percentage/grade/result, and class rank. See `server/lib/reportCard.js`.
- `GET /api/v1/evaluations/:evaluationId/report-card/:learnerId/pdf` — the same data rendered as a downloadable PDF (`pdfkit`, same pattern as `server/modules/certificates`).

**Permissions**:
Requires authentication AND the `exams` module must be enabled in the tenant's `active_modules` configuration (school/college tenants; not enabled for kindergarten in v1), AND `evaluations.view` (GET), `evaluations.manage` (evaluation/schedule CRUD), or `evaluations.grade` (recording a score) — checked against `onec_role_permissions` for the caller's role.

**Business rules**:
- A score is graded by the authenticated user (`graded_by`); re-submitting a score for the same learner+schedule updates it in place rather than duplicating.
- `max_score`/`passing_score` default to 100/40 if not provided on a schedule.
- **Report card grading scale** is a fixed default (90%+ A+, 80%+ A, 70%+ B+, 60%+ B, 50%+ C, 40%+ D, below 40% F) — not yet tenant-configurable. A subject's pass/fail uses that schedule's own `passing_score`, not the fixed 40% band; the overall result is `pass` only if every scheduled subject passed. A report card whose evaluation still has ungraded subjects (some schedules with no score recorded yet) reports `result: 'incomplete'` rather than `pass`/`fail` — it isn't final until every subject has a score.
- **Class rank** compares a learner against cohort-mates who have at least one score recorded for the same evaluation; any of *their* individual missing subject scores count as 0 toward their total. This is accurate once grading is finalized for the cohort, but can be a misleading mid-term snapshot (a peer who's only been graded in one easy subject looks artificially strong) — read it as "current standing," not a final rank, until every subject is graded.

**Row-level scoping**: `GET /schedules/:scheduleId/scores` scopes a `learner`-role caller to only their own score for that schedule (via `lib/ownLearner.js`), not the whole roster. Other roles are unscoped. Evaluation/schedule listing (`GET /` and `GET /:evaluationId/schedules`) isn't per-learner data and isn't scoped. The report-card endpoints use the same 404-not-403 scoping as `server/modules/certificates` — a learner/guardian requesting someone else's report card gets a 404, not a 403, so the id alone doesn't confirm it belongs to a real person.
