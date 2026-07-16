-- Per-tenant-schema migration. Run inside each existing tenant's schema —
-- new tenants get these tables automatically via
-- server/scripts/tenant_schema.sql. Backs server/modules/broadcast.
CREATE TABLE IF NOT EXISTS onec_broadcast_configs (
    id SERIAL PRIMARY KEY,
    channel VARCHAR(20) UNIQUE NOT NULL,
    api_url VARCHAR(500),
    http_method VARCHAR(10) NOT NULL DEFAULT 'POST',
    headers JSONB NOT NULL DEFAULT '{}',
    payload_template JSONB NOT NULL DEFAULT '{}',
    params_template JSONB NOT NULL DEFAULT '{}',
    variables JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT false,
    updated_by INT REFERENCES onec_users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS onec_broadcasts (
    id SERIAL PRIMARY KEY,
    channel VARCHAR(20) NOT NULL,
    message TEXT,
    voice_url VARCHAR(500),
    duration_seconds INT,
    status VARCHAR(30) NOT NULL DEFAULT 'pending_approval',
    audience_type VARCHAR(20),
    audience_ids JSONB,
    send_result JSONB,
    created_by INT REFERENCES onec_users(id),
    approved_by INT REFERENCES onec_users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- broadcast.* were added to the default permission set
-- (server/lib/permissions.js) — existing tenants need these rows
-- retrofitted too (ON CONFLICT DO NOTHING makes this idempotent).
-- broadcast.configure is admin-only (the config holds API credentials).
INSERT INTO onec_role_permissions (role, permission) VALUES
  ('admin', 'broadcast.view'), ('admin', 'broadcast.manage'), ('admin', 'broadcast.approve'), ('admin', 'broadcast.configure'),
  ('staff', 'broadcast.view'), ('staff', 'broadcast.manage'), ('staff', 'broadcast.approve'),
  ('instructor', 'broadcast.view'), ('instructor', 'broadcast.manage')
ON CONFLICT (role, permission) DO NOTHING;
