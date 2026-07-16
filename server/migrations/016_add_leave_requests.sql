-- Per-tenant-schema migration. Run inside each existing tenant's schema —
-- new tenants get this automatically via server/scripts/tenant_schema.sql.
-- Backs server/modules/leave. Class-teacher assignment (onec_cohorts.
-- advisor_id) and principal/vice_principal designation (meta.designation on
-- onec_instructors/onec_staff) need no migration — both reuse existing
-- columns (advisor_id already existed; designation lives in the existing
-- meta JSONB column).
CREATE TABLE IF NOT EXISTS onec_leave_requests (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES onec_users(id) ON DELETE CASCADE,
    applicant_role VARCHAR(20) NOT NULL,           -- 'instructor' | 'staff' | 'learner'
    leave_type VARCHAR(20) NOT NULL,               -- 'personal' | 'sick'
    reason TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_half_day BOOLEAN NOT NULL DEFAULT false,
    half_day_period VARCHAR(10),                   -- 'first_half' | 'second_half', set only when is_half_day
    num_days DECIMAL(4,1) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected' | 'cancelled'
    reviewed_by INT REFERENCES onec_users(id),
    reviewed_at TIMESTAMP,
    review_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- leave.* permissions added to server/lib/permissions.js's DEFAULT_ROLE_
-- PERMISSIONS — existing tenants need these rows retrofitted too (new
-- tenants get them from that same source at provisioning time).
INSERT INTO onec_role_permissions (role, permission) VALUES
  ('admin', 'leave.apply'), ('admin', 'leave.view_own'), ('admin', 'leave.approve'),
  ('instructor', 'leave.apply'), ('instructor', 'leave.view_own'), ('instructor', 'leave.approve'),
  ('staff', 'leave.apply'), ('staff', 'leave.view_own'), ('staff', 'leave.approve'),
  ('learner', 'leave.apply'), ('learner', 'leave.view_own')
ON CONFLICT (role, permission) DO NOTHING;
