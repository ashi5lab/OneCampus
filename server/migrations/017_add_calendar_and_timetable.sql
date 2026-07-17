-- Per-tenant-schema migration. Run inside each existing tenant's schema —
-- new tenants get this automatically via server/scripts/tenant_schema.sql.
-- Backs server/modules/calendar and server/modules/timetable.

-- Org Calendar (events + holidays). Recurrence is stored as a rule, not
-- materialized rows — server/modules/calendar/controller.js expands a rule
-- into concrete occurrences on read, for whatever date range is being
-- viewed, so editing "every Sunday" once updates every future Sunday
-- instead of needing to touch N rows.
CREATE TABLE IF NOT EXISTS onec_calendar_events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(20) NOT NULL DEFAULT 'event',    -- 'event' | 'holiday'
    start_date DATE NOT NULL,
    end_date DATE,                                      -- multi-day *non-recurring* events only; null = single day
    is_recurring BOOLEAN NOT NULL DEFAULT false,
    recurrence_type VARCHAR(20),                        -- 'weekly' | 'monthly' | 'yearly', null when not recurring
    recurrence_days JSONB,                               -- weekly: [0-6] weekday ints (0=Sunday); monthly: [1-31] day-of-month ints; yearly: unused (repeats on start_date's month/day)
    recurrence_end_date DATE,                            -- null = no defined end (expansion caps at a lookahead window)
    audience VARCHAR(20) NOT NULL DEFAULT 'all',         -- 'all' | 'instructors' | 'learners' | 'guardians' — mirrors onec_notices
    created_by INT REFERENCES onec_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Timetable — backed by the existing onec_allocations table (cohort +
-- module + instructor + weekly schedule_data), which had no module/UI
-- built against it at all until now. start_date/end_date are optional:
-- null on both (the common case) means the weekly pattern applies for the
-- whole time_block; setting them scopes it to a sub-range within the term
-- (e.g. a temporary substitute schedule, or an exam-week-only variation)
-- without needing a whole separate table.
ALTER TABLE onec_allocations
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;

-- calendar.*/timetable.* permissions added to server/lib/permissions.js's
-- DEFAULT_ROLE_PERMISSIONS — existing tenants need these rows retrofitted
-- too (new tenants get them from that same source at provisioning time).
INSERT INTO onec_role_permissions (role, permission) VALUES
  ('admin', 'calendar.view'), ('admin', 'calendar.manage'),
  ('admin', 'timetable.view'), ('admin', 'timetable.manage'),
  ('staff', 'calendar.view'), ('staff', 'timetable.view'),
  ('instructor', 'calendar.view'), ('instructor', 'timetable.view'),
  ('learner', 'calendar.view'), ('learner', 'timetable.view'),
  ('guardian', 'calendar.view'), ('guardian', 'timetable.view')
ON CONFLICT (role, permission) DO NOTHING;
