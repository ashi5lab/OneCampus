-- Per-tenant-schema migration. Run inside each existing tenant's schema —
-- new tenants get this automatically via server/scripts/tenant_schema.sql.
-- Backs server/modules/visitors — front-desk/gate-pass visitor register.

CREATE TABLE IF NOT EXISTS onec_visitor_logs (
    id SERIAL PRIMARY KEY,
    visitor_name VARCHAR(100) NOT NULL,
    visitor_phone VARCHAR(20),
    purpose VARCHAR(255) NOT NULL,
    host_name VARCHAR(100) NOT NULL,   -- whom they're visiting — free text since a host can be
                                        -- staff, an instructor, or someone unrelated to any roster row
    id_proof VARCHAR(100),
    check_in_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    check_out_time TIMESTAMP,
    logged_by INT REFERENCES onec_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- visitors.* added to server/lib/permissions.js's DEFAULT_ROLE_PERMISSIONS
-- (admin + staff only — a reception/security function, not learner/guardian
-- facing) — existing tenants need these rows retrofitted too (new tenants
-- get them from that same source at provisioning time).
INSERT INTO onec_role_permissions (role, permission) VALUES
  ('admin', 'visitors.view'), ('admin', 'visitors.log'),
  ('staff', 'visitors.view'), ('staff', 'visitors.log')
ON CONFLICT (role, permission) DO NOTHING;
