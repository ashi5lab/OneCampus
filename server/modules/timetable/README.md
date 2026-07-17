# Timetable Module

**Purpose**: the weekly class schedule — which module, taught by which instructor, on which day(s) and hour, for each cohort. Built on the pre-existing `onec_allocations` table (`cohort_id`, `module_id`, `instructor_id`, `schedule_data JSONB {days, hour}`, `time_block`, `start_date`, `end_date`), which had no server module or frontend UI against it before this — it also gives the existing period-based attendance feature (`onec_attendance.allocation_id`) a real path to being usable, since there was previously no way to create an allocation at all.

**One row = one recurring weekly period.** `schedule_data.days` is an array of weekday names (`["Monday", "Wednesday"]`) and `schedule_data.hour` is a `"HH:MM-HH:MM"` string — a period repeats on those weekdays, at that hour, for the whole `time_block` (the same term/semester label used by `onec_cohorts.time_block`). `start_date`/`end_date` are optional: null on both (the common case) means the pattern applies for the entire term; setting them scopes the period to a sub-range (a temporary substitute schedule, an exam-week-only variation) without needing a separate table.

**Conflict checking**: `POST`/`PUT` reject a period that collides with an existing one in the same `time_block` — either the same cohort double-booked into two periods at once, or the same instructor scheduled into two different classes at the same time. Checked as day-overlap + hour-overlap + date-range-overlap in JS (see `findConflict`), not the database, since the day/hour/date-range shape doesn't map cleanly onto a Postgres exclusion constraint here.

**API Endpoints**:
- `GET /api/v1/timetable?cohort_id=X` — one cohort's weekly grid (`timetable.view`). Learner/guardian roles are row-scoped to their own/linked cohort — a 403 if `cohort_id` isn't theirs.
- `GET /api/v1/timetable/my-cohorts` — a learner's own cohort, or a guardian's linked children's cohorts, for populating a "which class" picker without needing `cohorts.view` (`timetable.view`).
- `GET /api/v1/timetable/mine` — an instructor's own cross-cohort schedule (`timetable.view`, instructor role only).
- `POST /api/v1/timetable` / `PUT /api/v1/timetable/:id` / `DELETE /api/v1/timetable/:id` — manage periods (`timetable.manage`, admin-only by default).

**Permissions**: `timetable.view` (everyone by default) / `timetable.manage` (admin-only by default, same reasoning as `cohorts.manage` — this is a structural/administrative surface).
