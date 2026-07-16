-- Per-tenant-schema migration. No new tables — grants the new
-- users.manage_passwords permission (admin-only by default), which gates
-- the admin-side password reset in server/modules/profile. New tenants get
-- this automatically via seedDefaultPermissions() at provisioning time.
INSERT INTO onec_role_permissions (role, permission) VALUES
  ('admin', 'users.manage_passwords')
ON CONFLICT (role, permission) DO NOTHING;
