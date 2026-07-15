-- Per-tenant-schema migration (Phase 7 permissions system).
-- Run inside each existing tenant's schema — new tenants get this table
-- automatically via server/scripts/tenant_schema.sql. Existing tenants are
-- retrofitted by server/scripts/seedPermissionsForExistingTenants.js, which
-- applies this same DDL (kept here as documentation/reference) and then
-- seeds server/lib/permissions.js's DEFAULT_ROLE_PERMISSIONS.

CREATE TABLE IF NOT EXISTS onec_role_permissions (
    id SERIAL PRIMARY KEY,
    role VARCHAR(50) NOT NULL,
    permission VARCHAR(100) NOT NULL,
    UNIQUE(role, permission)
);
