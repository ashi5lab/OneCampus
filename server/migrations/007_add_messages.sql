-- Per-tenant-schema migration. Run inside each existing tenant's schema —
-- new tenants get this table automatically via
-- server/scripts/tenant_schema.sql. Backs server/modules/messages.
CREATE TABLE IF NOT EXISTS onec_messages (
    id SERIAL PRIMARY KEY,
    sender_id INT REFERENCES onec_users(id) ON DELETE CASCADE,
    recipient_id INT REFERENCES onec_users(id) ON DELETE CASCADE,
    subject VARCHAR(255),
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- messages.view/messages.send were added to every role's default
-- permissions (server/lib/permissions.js) — existing tenants need these
-- rows retrofitted too (ON CONFLICT DO NOTHING makes this idempotent).
INSERT INTO onec_role_permissions (role, permission) VALUES
  ('admin', 'messages.view'), ('admin', 'messages.send'),
  ('staff', 'messages.view'), ('staff', 'messages.send'),
  ('instructor', 'messages.view'), ('instructor', 'messages.send'),
  ('learner', 'messages.view'), ('learner', 'messages.send'),
  ('guardian', 'messages.view'), ('guardian', 'messages.send')
ON CONFLICT (role, permission) DO NOTHING;
