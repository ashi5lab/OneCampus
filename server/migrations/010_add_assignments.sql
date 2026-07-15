-- Per-tenant-schema migration. Run inside each existing tenant's schema —
-- new tenants get these tables automatically via
-- server/scripts/tenant_schema.sql. Backs server/modules/assignments.
CREATE TABLE IF NOT EXISTS onec_assignments (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    module_id INT REFERENCES onec_modules(id) ON DELETE CASCADE,
    cohort_id INT REFERENCES onec_cohorts(id) ON DELETE CASCADE,
    due_date DATE NOT NULL,
    max_score DECIMAL(5,2) DEFAULT 100.0,
    created_by INT REFERENCES onec_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS onec_assignment_submissions (
    id SERIAL PRIMARY KEY,
    assignment_id INT REFERENCES onec_assignments(id) ON DELETE CASCADE,
    learner_id INT REFERENCES onec_learners(id) ON DELETE CASCADE,
    submission_text TEXT,
    submitted_at TIMESTAMP,
    score_obtained DECIMAL(5,2),
    feedback TEXT,
    graded_by INT REFERENCES onec_users(id),
    graded_at TIMESTAMP,
    UNIQUE(assignment_id, learner_id)
);

-- assignments.* were added to the default permission set
-- (server/lib/permissions.js) — existing tenants need these rows
-- retrofitted too (ON CONFLICT DO NOTHING makes this idempotent).
INSERT INTO onec_role_permissions (role, permission) VALUES
  ('admin', 'assignments.view'), ('admin', 'assignments.manage'), ('admin', 'assignments.grade'),
  ('staff', 'assignments.view'), ('staff', 'assignments.manage'), ('staff', 'assignments.grade'),
  ('instructor', 'assignments.view'), ('instructor', 'assignments.manage'), ('instructor', 'assignments.grade'),
  ('learner', 'assignments.view'), ('learner', 'assignments.submit'),
  ('guardian', 'assignments.view')
ON CONFLICT (role, permission) DO NOTHING;
