-- Per-tenant-schema migration. Run inside each existing tenant's schema —
-- new tenants get this automatically via server/scripts/tenant_schema.sql.
--
-- Bulk upload no longer accepts username/password columns — every row now
-- gets an auto-generated login (see server/lib/credentials.js), and the
-- admin downloads the results afterward instead of typing credentials in
-- up front. This is where those generated credentials are held until that
-- download happens (see server/modules/bulkUpload/controller.js's
-- downloadCredentials) — same shape/purpose as the existing `errors` column.
ALTER TABLE onec_bulk_upload_jobs
  ADD COLUMN IF NOT EXISTS credentials JSONB NOT NULL DEFAULT '[]';
