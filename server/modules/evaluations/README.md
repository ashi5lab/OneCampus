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

**Permissions**:
Requires authentication AND the `exams` module must be enabled in the tenant's `active_modules` configuration (school/college tenants; not enabled for kindergarten in v1), AND `evaluations.view` (GET), `evaluations.manage` (evaluation/schedule CRUD), or `evaluations.grade` (recording a score) — checked against `onec_role_permissions` for the caller's role.

**Business rules**:
- A score is graded by the authenticated user (`graded_by`); re-submitting a score for the same learner+schedule updates it in place rather than duplicating.
- `max_score`/`passing_score` default to 100/40 if not provided on a schedule.
