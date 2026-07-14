-- Per-tenant-schema migration. Run inside each existing tenant's schema —
-- new tenants get this table automatically via
-- server/scripts/tenant_schema.sql. Existing tenants are retrofitted by
-- server/scripts/seedAuditLogsForExistingTenants.js, which applies this
-- same DDL (kept here as documentation/reference).

CREATE TABLE IF NOT EXISTS onec_audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
