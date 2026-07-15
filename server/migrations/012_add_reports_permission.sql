-- Per-tenant-schema migration. No new tables — the Reports module
-- (server/modules/reports) is read-only aggregation over existing tables.
-- New tenants get this automatically via seedDefaultPermissions() at
-- provisioning time (see server/lib/permissions.js); existing tenants need
-- this row retrofitted.
INSERT INTO onec_role_permissions (role, permission) VALUES
  ('admin', 'reports.view'),
  ('staff', 'reports.view')
ON CONFLICT (role, permission) DO NOTHING;
