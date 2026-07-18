-- Per-tenant-schema migration. Run inside each existing tenant's schema —
-- new tenants get this automatically via server/scripts/tenant_schema.sql.
-- Backs server/modules/idCards. No new table — ID cards are rendered on
-- demand as a PDF from existing roster + profile picture data, never
-- stored (same "computed, not stored" approach as report cards).

INSERT INTO onec_role_permissions (role, permission) VALUES
  ('admin', 'id_cards.generate'),
  ('staff', 'id_cards.generate')
ON CONFLICT (role, permission) DO NOTHING;
