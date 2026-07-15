-- Per-tenant-schema migration. Run inside each existing tenant's schema —
-- new tenants get this table automatically via
-- server/scripts/tenant_schema.sql. Backs server/modules/notices.
CREATE TABLE IF NOT EXISTS onec_notices (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    audience VARCHAR(20) NOT NULL DEFAULT 'all',
    posted_by INT REFERENCES onec_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- notices.view/notices.manage were added to the default permission set
-- (server/lib/permissions.js) — existing tenants need these rows
-- retrofitted too (ON CONFLICT DO NOTHING makes this idempotent).
INSERT INTO onec_role_permissions (role, permission) VALUES
  ('admin', 'notices.view'), ('admin', 'notices.manage'),
  ('staff', 'notices.view'), ('staff', 'notices.manage'),
  ('instructor', 'notices.view'),
  ('learner', 'notices.view'),
  ('guardian', 'notices.view')
ON CONFLICT (role, permission) DO NOTHING;
