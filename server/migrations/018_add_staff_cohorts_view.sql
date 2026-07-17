-- Per-tenant-schema migration. Run inside each existing tenant's schema —
-- new tenants get this automatically via server/lib/permissions.js's
-- DEFAULT_ROLE_PERMISSIONS at provisioning time.
--
-- Staff need cohorts.view (read-only) to pick a class in the Timetable
-- module's "By Class" view (server/modules/timetable) — they previously had
-- no cohorts access at all.
INSERT INTO onec_role_permissions (role, permission) VALUES
  ('staff', 'cohorts.view')
ON CONFLICT (role, permission) DO NOTHING;
