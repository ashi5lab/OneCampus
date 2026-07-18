-- Per-tenant-schema migration. Run inside each existing tenant's schema —
-- new tenants get this automatically via server/scripts/tenant_schema.sql.
-- Backs server/modules/bulkUpload — bulk CSV/Excel import of learners/
-- instructors/staff.

-- One row per uploaded file. Processing happens after the upload response
-- is already sent (see server/modules/bulkUpload/controller.js) — this row
-- is what the frontend polls (GET /bulk-upload/jobs/:id) to show "still
-- processing" vs. a final per-row success/failure breakdown, since a
-- few-hundred-row import can take longer than one request is worth holding
-- open for.
CREATE TABLE IF NOT EXISTS onec_bulk_upload_jobs (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(20) NOT NULL,   -- 'learner' | 'instructor' | 'staff'
    original_filename VARCHAR(255),
    status VARCHAR(30) NOT NULL DEFAULT 'processing',  -- 'processing' | 'completed' | 'completed_with_errors' | 'failed'
    total_rows INT NOT NULL DEFAULT 0,
    success_count INT NOT NULL DEFAULT 0,
    failure_count INT NOT NULL DEFAULT 0,
    -- Array of { row, identifier, error } for every row that failed —
    -- enough to render a table in the UI or regenerate a downloadable
    -- "failures" workbook (server/lib/bulkUploadTemplates.js) without
    -- re-reading the original file, which isn't kept after processing.
    errors JSONB NOT NULL DEFAULT '[]',
    created_by INT REFERENCES onec_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- bulk_upload.manage added to server/lib/permissions.js's ALL_PERMISSIONS
-- (admin-only by default, same tier as users.manage_passwords — bulk
-- account creation across the whole roster is a higher-blast-radius action
-- than the per-record learners.manage/instructors.manage/staff.manage
-- create endpoints it sits alongside) — existing tenants need this row
-- retrofitted too (new tenants get it from that same source at
-- provisioning time).
INSERT INTO onec_role_permissions (role, permission) VALUES
  ('admin', 'bulk_upload.manage')
ON CONFLICT (role, permission) DO NOTHING;
