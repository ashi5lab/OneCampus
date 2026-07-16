-- Per-tenant-schema migration. Run inside each existing tenant's schema —
-- new tenants get these tables automatically via
-- server/scripts/tenant_schema.sql. Backs server/modules/accessControl and
-- server/modules/staff.
CREATE TABLE IF NOT EXISTS onec_access_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]',
    target_type VARCHAR(20) NOT NULL,
    target_role VARCHAR(50),
    created_by INT REFERENCES onec_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS onec_access_group_members (
    group_id INT REFERENCES onec_access_groups(id) ON DELETE CASCADE,
    user_id INT REFERENCES onec_users(id) ON DELETE CASCADE,
    PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS onec_staff (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE REFERENCES onec_users(id) ON DELETE CASCADE,
    staff_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    meta JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- access_control.manage / staff.view / staff.manage were added to the
-- default permission set (server/lib/permissions.js) — existing tenants
-- need these rows retrofitted too (ON CONFLICT DO NOTHING makes this
-- idempotent). Both admin-only by default, same reasoning as
-- users.manage_passwords/broadcast.configure — access control and the
-- staff roster are both sensitive, tenant-wide-impact surfaces.
INSERT INTO onec_role_permissions (role, permission) VALUES
  ('admin', 'access_control.manage'),
  ('admin', 'staff.view'), ('admin', 'staff.manage')
ON CONFLICT (role, permission) DO NOTHING;

-- The existing 'staff' role's default permission set changed from
-- "everything except a couple of admin-only powers" to a narrow
-- messages+notices default (see the comment on DEFAULT_ROLE_PERMISSIONS.staff
-- in server/lib/permissions.js for why this was safe — no tenant could
-- actually have staff-role users before this session added a roster UI for
-- them). This INSERT only adds the new narrow rows if they're missing; it
-- deliberately does NOT remove any broader permissions a 'staff' role may
-- already have in onec_role_permissions on tenants that somehow already
-- have staff users — if you want to actually narrow an existing tenant's
-- staff role down to match the new default, that's a separate, explicit
-- DELETE you'd run yourself after reviewing what's actually in use.
INSERT INTO onec_role_permissions (role, permission) VALUES
  ('staff', 'messages.view'), ('staff', 'messages.send'),
  ('staff', 'notices.view'), ('staff', 'notices.manage')
ON CONFLICT (role, permission) DO NOTHING;
