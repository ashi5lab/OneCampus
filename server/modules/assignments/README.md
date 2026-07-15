# Assignments Module

**Purpose**: Homework/assignments, distinct from the Evaluations module's formal exams. Simpler shape than Evaluations' evaluation+schedule split — one `onec_assignments` row IS the specific task for one cohort/module, no separate "exam type" umbrella needed.

**API Endpoints**:
- `GET /api/v1/assignments` — a `learner` sees only assignments for their own cohort (relevance filtering, not a security boundary — any authenticated user could already learn their own cohort id). Everyone else sees every assignment tenant-wide.
- `POST /api/v1/assignments` / `PUT /api/v1/assignments/:id` / `DELETE /api/v1/assignments/:id` — `{ title, description?, module_id, cohort_id, due_date, max_score? }`.
- `GET /api/v1/assignments/:id/submissions` — graders (`admin`/`staff`/`instructor`) see every submission; a learner sees only their own.
- `POST /api/v1/assignments/:id/submissions` — `{ submission_text }`. `learner_id` is always resolved server-side from the caller's own `onec_learners` row, never taken from the request body — a learner can't submit on someone else's behalf. Upsert by `(assignment_id, learner_id)`, same pattern as `attendance`'s `mark()`.
- `PUT /api/v1/assignments/submissions/:submissionId/grade` — `{ score_obtained, feedback? }`.

**Permissions**: `assignments.view` (everyone by default) / `assignments.manage` + `assignments.grade` (admin/staff/instructor — posting and grading homework is a teacher-side action) / `assignments.submit` (learner only — the learner-side counterpart).

**Business Rules**:
- Text-only submissions in v1 — no file/attachment upload, though `server/lib/cloudinary.js` (added for profile pictures) could be reused for that later if needed.
- **Known gap**: a `guardian` has `assignments.view` (so the assignment list is visible) but `listSubmissions`' row-scoping only resolves a `learner`'s own id (`lib/ownLearner.js`), not a guardian's linked children — a guardian querying a submission list gets an empty result instead of their child's actual submission. Not a security issue (they can't see *other* children's submissions either), just an incompleteness; would need `lib/rowScope.js`'s `getScopedLearnerIds` wired in here to close it properly.
