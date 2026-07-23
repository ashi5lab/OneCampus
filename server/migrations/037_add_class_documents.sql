-- Class documents — a per-cohort file library (course materials shared by
-- instructors), backing the Class channel's Documents tab. Distinct from
-- chat post attachments (onec_class_posts.attachment_*): those ride along a
-- message, these are standalone resources uploaded straight to the tab.
-- Files live in Cloudflare R2 (see server/lib/storage.js); only the public
-- URL + metadata are stored here.
-- NOT auto-run — apply manually to each tenant schema, same as every prior
-- migration in this directory.

CREATE TABLE onec_class_documents (
    id SERIAL PRIMARY KEY,
    cohort_id INT NOT NULL REFERENCES onec_cohorts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    file_type VARCHAR(20) NOT NULL,   -- image | pdf | doc | xls | ppt | zip | file (see attachmentTypeLabel)
    size_bytes BIGINT,
    mime_type VARCHAR(120),
    uploaded_by INT REFERENCES onec_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_class_documents_cohort_created ON onec_class_documents(cohort_id, created_at DESC);
