-- Per-tenant-schema migration. Run inside each existing tenant's schema —
-- new tenants get this column automatically via
-- server/scripts/tenant_schema.sql. Adds the column backing profile
-- picture uploads (server/modules/profile, server/lib/cloudinary.js).
ALTER TABLE onec_users ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(500);
