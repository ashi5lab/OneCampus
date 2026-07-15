-- Per-tenant-schema migration. Run inside each existing tenant's schema —
-- new tenants get these tables automatically via
-- server/scripts/tenant_schema.sql. Backs server/modules/library.
CREATE TABLE IF NOT EXISTS onec_library_books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255),
    isbn VARCHAR(50),
    category VARCHAR(100),
    total_copies INT NOT NULL DEFAULT 1,
    available_copies INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS onec_library_loans (
    id SERIAL PRIMARY KEY,
    book_id INT REFERENCES onec_library_books(id) ON DELETE CASCADE,
    borrower_id INT REFERENCES onec_users(id) ON DELETE CASCADE,
    borrowed_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    returned_date DATE,
    issued_by INT REFERENCES onec_users(id)
);

-- library.view/library.manage were added to the default permission set
-- (server/lib/permissions.js) — existing tenants need these rows
-- retrofitted too (ON CONFLICT DO NOTHING makes this idempotent).
INSERT INTO onec_role_permissions (role, permission) VALUES
  ('admin', 'library.view'), ('admin', 'library.manage'),
  ('staff', 'library.view'), ('staff', 'library.manage'),
  ('instructor', 'library.view'),
  ('learner', 'library.view'),
  ('guardian', 'library.view')
ON CONFLICT (role, permission) DO NOTHING;
