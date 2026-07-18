# Reports Module

**Purpose**: A single "all types of reports regarding school, students, and all features" page for admin/staff — read-only aggregation across every other module (roster, attendance, evaluations, assignments, online exams, library, certificates). No new tables; every endpoint is a `SELECT`/`GROUP BY` over existing module tables.

**API Endpoints** (all `GET`, all gated by `reports.view`):
- `/api/v1/reports/overview` — school-wide counts (learners/instructors/guardians/cohorts/units/modules), 30-day attendance rate, open assignments, exams pending grade / published, library title/copy counts + overdue loan count, 30-day notice count, certificates issued.
- `/api/v1/reports/analytics` — chart-ready aggregates backing the Reports page's Analytics tab: 14-day learner attendance trend, today's attendance by status, average score by class, published-exam pass rates, plus (added alongside the later feature-gap modules) 30-day staff attendance rate, all-time PTM slot booking rate, outstanding library fines (computed via `lib/libraryFines.js`'s `computeFine`, same as the Library page's waive-fine flow — not a stored value), 30-day discipline incident counts by severity, 14-day visitor-log traffic trend, and total alumni count.
- `/api/v1/reports/attendance?cohort_id=&from=&to=` — per-learner present/absent/late/excused counts and attendance rate within a date range (defaults to the last 30 days). `cohort_id` narrows to one class/section.
- `/api/v1/reports/academic-performance?cohort_id=&module_id=` — per-learner average score percentage across `onec_learner_scores`/`onec_evaluation_schedules` (Evaluations module), optionally narrowed by cohort or subject.
- `/api/v1/reports/assignments` — per-assignment submission count, graded count, average score, and completion rate (`submissions / active learners in that assignment's cohort`).
- `/api/v1/reports/online-exams` — per-exam started/submitted/graded counts, average score, and pass rate (`total_score >= 40% of max_score`, matching Evaluations' default `passing_score` convention since online exams has no per-exam passing threshold of its own).
- `/api/v1/reports/library` — every book with its total borrow count (`times_borrowed`), plus a separate list of currently overdue loans.
- `/api/v1/reports/certificates` — certificate counts grouped by type, plus the 50 most recently issued.

**Permissions**: `reports.view` — **admin/staff only**. Unlike most `.view` permissions this session, it's deliberately not granted to `instructor`/`learner`/`guardian`: every query here aggregates across the whole cohort/tenant (not row-scoped to "your own" anything), so it's an operational/management surface, not a personal one.

**Depends on**: every other feature module's tables already existing in the tenant schema — `overview`/`assignments` need migration `010`, `online-exams` needs `011`, `library` needs `009`. A tenant that hasn't run those migrations yet will get a `500` from the endpoints that touch those tables (no defensive fallback — same as every other cross-feature query in this codebase, it assumes the schema it queries exists).
