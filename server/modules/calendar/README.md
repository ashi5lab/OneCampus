# Calendar Module

**Purpose**: an org-wide calendar of events and holidays, with recurrence rules (weekly on given weekdays, monthly on a given day-of-month, or yearly on an anniversary date) — e.g. "every Sunday is a holiday," or "Republic Day, every January 26th." Also surfaces notices, exam schedules, and assignment due dates on the same view, so there's one place to see "what's happening," not four separate screens.

**Recurrence is a stored rule, not materialized rows.** Editing "every Sunday" once updates every future Sunday — the alternative (writing one row per future occurrence) would mean an edit has to touch potentially hundreds of rows, and there's no natural end to how far ahead to pre-generate. `GET /agenda` expands each rule into concrete date occurrences for whatever range is being viewed, computed in JS (not SQL) since the three recurrence types (weekly/monthly/yearly) don't map cleanly onto one `generate_series` shape. When `recurrence_end_date` is null, expansion is capped at a 2-year lookahead from the query's start rather than iterating forever.

**API Endpoints**:
- `GET /api/v1/calendar/agenda?from=YYYY-MM-DD&to=YYYY-MM-DD` — the unified view: own events/holidays (expanded), notices, exam schedules, assignment due dates, normalized into one shape (`{source, type, id, title, date, endDate}`) and sorted by date. This is what the frontend calendar actually renders.
- `GET /api/v1/calendar/events` — raw, unexpanded calendar_events rows, for the admin management list (editing the recurrence rule itself, not one occurrence of it).
- `POST /api/v1/calendar/events` / `PUT /api/v1/calendar/events/:id` / `DELETE /api/v1/calendar/events/:id` — manage events/holidays (`calendar.manage`).

**Audience scoping**: `audience` on `onec_calendar_events` mirrors `onec_notices` exactly (`'all' | 'instructors' | 'learners' | 'guardians'`) — same filtering logic, admin/staff see everything regardless of audience since they manage the calendar.

**Permissions**: `calendar.view` (everyone by default) / `calendar.manage` (admin-only by default, same reasoning as `cohorts.manage`/`units.manage` — this is a structural/administrative surface, not row-scoped personal data).
