-- Per-tenant-schema migration. Run inside each existing tenant's schema —
-- new tenants get this automatically via server/scripts/tenant_schema.sql.
-- Backs server/modules/ptm — parent-teacher meeting slot scheduling.

-- A bookable time slot an instructor has opened up. cohort_id is purely
-- informational (which class this PTM day is for) — not enforced against
-- who can book it; any guardian/learner with ptm.book can book any open
-- slot, same as a real paper sign-up sheet posted outside a classroom.
CREATE TABLE IF NOT EXISTS onec_ptm_slots (
    id SERIAL PRIMARY KEY,
    instructor_id INT NOT NULL REFERENCES onec_instructors(id) ON DELETE CASCADE,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    cohort_id INT REFERENCES onec_cohorts(id),
    created_by INT REFERENCES onec_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- One booking per slot (UNIQUE(slot_id)) — a slot is either open or taken,
-- no multiple families sharing one meeting time.
CREATE TABLE IF NOT EXISTS onec_ptm_bookings (
    id SERIAL PRIMARY KEY,
    slot_id INT NOT NULL REFERENCES onec_ptm_slots(id) ON DELETE CASCADE,
    learner_id INT NOT NULL REFERENCES onec_learners(id) ON DELETE CASCADE,
    booked_by INT REFERENCES onec_users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(slot_id)
);

-- ptm.* added to server/lib/permissions.js's DEFAULT_ROLE_PERMISSIONS —
-- existing tenants need these rows retrofitted too (new tenants get them
-- from that same source at provisioning time).
-- instructor gets ptm.view only, not ptm.manage — an instructor manages
-- only their own slots via a self-ownership check in the handler
-- (canManageSlot), not the tenant-wide ptm.manage admin/staff hold.
INSERT INTO onec_role_permissions (role, permission) VALUES
  ('admin', 'ptm.view'), ('admin', 'ptm.manage'), ('admin', 'ptm.book'),
  ('staff', 'ptm.view'), ('staff', 'ptm.manage'),
  ('instructor', 'ptm.view'),
  ('learner', 'ptm.view'), ('learner', 'ptm.book'),
  ('guardian', 'ptm.view'), ('guardian', 'ptm.book')
ON CONFLICT (role, permission) DO NOTHING;
