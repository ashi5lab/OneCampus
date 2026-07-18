-- Per-tenant-schema migration. Run inside each existing tenant's schema —
-- new tenants get this automatically via server/scripts/tenant_schema.sql.
-- Backs server/modules/substitutes — assigning a covering instructor to a
-- specific timetable period on a specific date, for an approved instructor
-- leave (server/modules/leave) that would otherwise leave it uncovered.

-- One row per (allocation, date) that's been covered — "which periods need
-- covering" for a given leave is computed on read (see
-- server/lib/substituteCoverage.js), not stored; only an actual assignment
-- is persisted. date is a specific calendar date, not a weekday — one
-- recurring onec_allocations row can need a different (or no) substitute on
-- each date it recurs during a leave's range.
CREATE TABLE IF NOT EXISTS onec_substitute_assignments (
    id SERIAL PRIMARY KEY,
    leave_request_id INT REFERENCES onec_leave_requests(id) ON DELETE CASCADE,
    allocation_id INT NOT NULL REFERENCES onec_allocations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    substitute_instructor_id INT NOT NULL REFERENCES onec_instructors(id),
    assigned_by INT REFERENCES onec_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(allocation_id, date)
);

-- substitutes.* added to server/lib/permissions.js's DEFAULT_ROLE_
-- PERMISSIONS — existing tenants need these rows retrofitted too (new
-- tenants get them from that same source at provisioning time).
INSERT INTO onec_role_permissions (role, permission) VALUES
  ('admin', 'substitutes.view'), ('admin', 'substitutes.manage'),
  ('staff', 'substitutes.view'), ('staff', 'substitutes.manage'),
  ('instructor', 'substitutes.view')
ON CONFLICT (role, permission) DO NOTHING;
