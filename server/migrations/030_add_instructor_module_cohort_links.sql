-- Per-tenant-schema migration. Run inside each existing tenant's schema —
-- new tenants get this automatically via server/scripts/tenant_schema.sql.
-- Backs server/modules/instructorModules and server/modules/instructorCohorts
-- — a teacher can teach multiple subjects, and a class can have multiple
-- teachers assigned to it, independent of any specific scheduled Timetable
-- period (onec_allocations already ties instructor+module+cohort together,
-- but only for an actual scheduled slot — this is a lighter-weight roster/
-- qualification link, same shape as onec_learner_guardian_map).

CREATE TABLE IF NOT EXISTS onec_instructor_modules (
    instructor_id INT REFERENCES onec_instructors(id) ON DELETE CASCADE,
    module_id INT REFERENCES onec_modules(id) ON DELETE CASCADE,
    PRIMARY KEY (instructor_id, module_id)
);

CREATE TABLE IF NOT EXISTS onec_instructor_cohorts (
    instructor_id INT REFERENCES onec_instructors(id) ON DELETE CASCADE,
    cohort_id INT REFERENCES onec_cohorts(id) ON DELETE CASCADE,
    PRIMARY KEY (instructor_id, cohort_id)
);

-- instructor_modules.*/instructor_cohorts.* added to server/lib/permissions.js's
-- DEFAULT_ROLE_PERMISSIONS (admin manages both; admin + instructor can view,
-- matching how instructor already has instructors.view/modules.view/
-- cohorts.view but not the .manage side of any of those three) — existing
-- tenants need these rows retrofitted too (new tenants get them from that
-- same source at provisioning time).
INSERT INTO onec_role_permissions (role, permission) VALUES
  ('admin', 'instructor_modules.view'), ('admin', 'instructor_modules.manage'),
  ('admin', 'instructor_cohorts.view'), ('admin', 'instructor_cohorts.manage'),
  ('instructor', 'instructor_modules.view'),
  ('instructor', 'instructor_cohorts.view')
ON CONFLICT (role, permission) DO NOTHING;
