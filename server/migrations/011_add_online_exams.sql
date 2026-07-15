-- Per-tenant-schema migration. Run inside each existing tenant's schema —
-- new tenants get these tables automatically via
-- server/scripts/tenant_schema.sql. Backs server/modules/onlineExams.
CREATE TABLE IF NOT EXISTS onec_online_exams (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    module_id INT REFERENCES onec_modules(id) ON DELETE CASCADE,
    cohort_id INT REFERENCES onec_cohorts(id) ON DELETE CASCADE,
    grading_type VARCHAR(20) NOT NULL DEFAULT 'manual',
    duration_minutes INT NOT NULL DEFAULT 60,
    max_score DECIMAL(6,2) NOT NULL DEFAULT 0,
    published BOOLEAN NOT NULL DEFAULT false,
    published_at TIMESTAMP,
    created_by INT REFERENCES onec_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS onec_exam_questions (
    id SERIAL PRIMARY KEY,
    exam_id INT REFERENCES onec_online_exams(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) NOT NULL DEFAULT 'text',
    options JSONB,
    correct_option INT,
    max_score DECIMAL(6,2) NOT NULL DEFAULT 1,
    order_index INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS onec_exam_submissions (
    id SERIAL PRIMARY KEY,
    exam_id INT REFERENCES onec_online_exams(id) ON DELETE CASCADE,
    learner_id INT REFERENCES onec_learners(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP,
    total_score DECIMAL(6,2),
    graded_by INT REFERENCES onec_users(id),
    graded_at TIMESTAMP,
    UNIQUE(exam_id, learner_id)
);

CREATE TABLE IF NOT EXISTS onec_exam_answers (
    id SERIAL PRIMARY KEY,
    submission_id INT REFERENCES onec_exam_submissions(id) ON DELETE CASCADE,
    question_id INT REFERENCES onec_exam_questions(id) ON DELETE CASCADE,
    answer_text TEXT,
    selected_option INT,
    score_obtained DECIMAL(6,2),
    feedback TEXT,
    UNIQUE(submission_id, question_id)
);

-- online_exams.* were added to the default permission set
-- (server/lib/permissions.js) — existing tenants need these rows
-- retrofitted too (ON CONFLICT DO NOTHING makes this idempotent).
INSERT INTO onec_role_permissions (role, permission) VALUES
  ('admin', 'online_exams.view'), ('admin', 'online_exams.manage'), ('admin', 'online_exams.grade'),
  ('staff', 'online_exams.view'), ('staff', 'online_exams.manage'), ('staff', 'online_exams.grade'),
  ('instructor', 'online_exams.view'), ('instructor', 'online_exams.manage'), ('instructor', 'online_exams.grade'),
  ('learner', 'online_exams.view'), ('learner', 'online_exams.take'),
  ('guardian', 'online_exams.view')
ON CONFLICT (role, permission) DO NOTHING;
