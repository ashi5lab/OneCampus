# Evaluations Feature (Frontend)

**Purpose**: Create evaluations, schedule them against a module (Subject/Course), and record scores.

- `EvaluationsPage` (`/evaluations`) — list + create evaluations.
- `EvaluationDetailPage` (`/evaluations/:id`) — list + create schedules for one evaluation. The module picker reads from the new `features/modules` slice.
- `ScoreEntryPage` (`/evaluations/schedules/:scheduleId/scores`) — every learner tenant-wide with a score input, pre-filled from existing scores, "Save All" batches one upsert `POST` per learner with a non-empty value.

**API Endpoints used**: `GET/POST /api/v1/evaluations`, `GET/POST /api/v1/evaluations/:evaluationId/schedules`, `GET/POST /api/v1/evaluations/schedules/:scheduleId/scores`.

**Known limitation**: `ScoreEntryPage` shows *all* learners, not just those enrolled in the schedule's module/cohort — there's no cohort↔module enrollment relationship in the schema yet to filter by. Same coarse-grained shape as the attendance roster's cohort filter, just without even that.

**Permissions**: server-enforced via `evaluations.view`/`evaluations.manage`/`evaluations.grade` — see `server/modules/evaluations/README.md`.
