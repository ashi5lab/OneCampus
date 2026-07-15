# Online Exams Module

**Purpose**: In-app exams a learner actually takes and submits, distinct from both the Evaluations module (offline/paper exam score entry) and Assignments (freeform homework with no answer key). Supports two grading types set per-exam:
- `manual` — every question is graded by a teacher after submission (text or MCQ questions allowed).
- `auto` — every question must be MCQ with a `correct_option`; scored immediately on submit, no grader step.

**API Endpoints**:
- `GET /api/v1/online-exams` — a `learner` sees only exams for their own cohort, plus their own submission status (`my_status`/`my_score`) so the list page can show Start/Continue/View Results. Everyone else sees every exam tenant-wide.
- `GET /api/v1/online-exams/:id` — exam + ordered questions. `correct_option` is stripped from the response for non-graders (`admin`/`staff`/`instructor` see it, everyone else gets `null`) so the answer key never reaches an exam-taker's network tab.
- `POST /api/v1/online-exams` / `PUT /api/v1/online-exams/:id` / `DELETE /api/v1/online-exams/:id` — `{ title, description?, module_id, cohort_id, grading_type, duration_minutes?, questions: [{ question_text, question_type, options?, correct_option?, max_score? }] }`. `max_score` on the exam itself is always server-computed as the sum of question `max_score`s, never taken from the request.
  - **Once a submission exists for an exam, `PUT` only updates exam metadata** (title/description/module/cohort/duration) — the question set is frozen. `onec_exam_questions` cascades to `onec_exam_answers` on delete, so replacing questions after learners have started would silently wipe their answers/grades; delete and recreate the exam instead if the question set needs to change.
- `PUT /api/v1/online-exams/:id/publish` — `{ published: boolean }`. Gates whether learners can see their score/feedback and the answer key via `my-submission` — publishing is a separate, explicit step from grading, matching the spec's "results can be published" requirement.
- `POST /api/v1/online-exams/:id/start` — learner-only. Idempotent: creates an `in_progress` submission, or returns the existing one if already started/submitted/graded.
- `GET /api/v1/online-exams/:id/my-submission` — learner's own submission + their answers. `score_obtained`/`feedback`/`total_score` are `null` until the exam is published, even if grading already happened server-side.
- `POST /api/v1/online-exams/:id/submit` — `{ answers: [{ question_id, answer_text?, selected_option? }] }`. `learner_id` is always resolved server-side, same as assignments. Rejects if not started or already submitted. For `auto` exams, scores every answer immediately by comparing `selected_option` to `correct_option` and marks the submission `graded`; for `manual` exams, marks it `submitted` and leaves scoring to a grader.
- `GET /api/v1/online-exams/:id/submissions` — grader-only (`online_exams.grade`) roster: every learner's submission status/score for this exam.
- `GET /api/v1/online-exams/submissions/:submissionId` — grader-only: one submission's full answer sheet (including `correct_option` for MCQ reference) for the manual-grading UI.
- `PUT /api/v1/online-exams/submissions/:submissionId/grade` — `{ scores: [{ question_id, score_obtained, feedback? }] }`. Grader assigns a score per question; `total_score` is server-computed as the sum across all answered questions and the submission is marked `graded`.

**Permissions**: `online_exams.view` (everyone) / `online_exams.manage` (admin/staff/instructor — create/edit/delete/publish, the "teachers or people who have given access" case from the spec) / `online_exams.grade` (admin/staff/instructor — manual grading, separate from `.manage` in case a tenant wants to grant grading without exam-authoring rights) / `online_exams.take` (learner only — starting and submitting).

**Known gap** (same shape as the one documented in `server/modules/assignments/README.md`): a `guardian` has `online_exams.view` but no row-scoping is wired for a guardian to see their linked child's submission/results — not a security issue, just incomplete.
