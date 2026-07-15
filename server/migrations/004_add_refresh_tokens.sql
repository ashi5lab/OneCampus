-- Per-tenant-schema migration. Run inside each existing tenant's schema —
-- new tenants get this table automatically via
-- server/scripts/tenant_schema.sql. Existing tenants are retrofitted by
-- server/scripts/seedRefreshTokensForExistingTenants.js, which applies this
-- same DDL (kept here as documentation/reference).

CREATE TABLE IF NOT EXISTS onec_refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES onec_users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
