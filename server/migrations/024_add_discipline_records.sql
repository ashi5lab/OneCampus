-- Per-tenant-schema migration. Run inside each existing tenant's schema —
-- new tenants get this automatically via server/scripts/tenant_schema.sql.
-- Backs server/modules/discipline — incident/behavior records per learner.

CREATE TABLE IF NOT EXISTS onec_discipline_records (
    id SERIAL PRIMARY KEY,
    learner_id INT NOT NULL REFERENCES onec_learners(id) ON DELETE CASCADE,
    incident_date DATE NOT NULL,
    severity VARCHAR(20) NOT NULL,   -- 'minor' | 'major' | 'positive' — a behavior note isn't always a demerit
    description TEXT NOT NULL,
    action_taken TEXT,
    reported_by INT REFERENCES onec_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- discipline.* added to server/lib/permissions.js's DEFAULT_ROLE_
-- PERMISSIONS — existing tenants need these rows retrofitted too (new
-- tenants get them from that same source at provisioning time).
INSERT INTO onec_role_permissions (role, permission) VALUES
  ('admin', 'discipline.view'), ('admin', 'discipline.log'),
  ('staff', 'discipline.view'), ('staff', 'discipline.log'),
  ('instructor', 'discipline.view'), ('instructor', 'discipline.log'),
  ('learner', 'discipline.view'),
  ('guardian', 'discipline.view')
ON CONFLICT (role, permission) DO NOTHING;
