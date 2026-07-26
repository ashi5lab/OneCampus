-- Migration 041: Add Exams module + taken_by to assignments

-- 1. Add taken_by to assignments (backfill from created_by)
ALTER TABLE onec_assignments ADD COLUMN IF NOT EXISTS taken_by INT REFERENCES onec_users(id);
UPDATE onec_assignments SET taken_by = created_by WHERE taken_by IS NULL;

-- 2. Core exams table (mirrors assignments, uses exam_date instead of due_date, has taken_by)
CREATE TABLE IF NOT EXISTS onec_exams (
  id             SERIAL PRIMARY KEY,
  title          TEXT NOT NULL,
  description    TEXT,
  module_id      INT REFERENCES onec_modules(id) ON DELETE SET NULL,
  exam_date      DATE NOT NULL,
  eval_type      VARCHAR(10)  NOT NULL DEFAULT 'marks',
  max_score      NUMERIC,
  passing_marks  NUMERIC,
  pass_grade     TEXT,
  instructions   TEXT,
  target_type    VARCHAR(20)  NOT NULL DEFAULT 'class',
  status         VARCHAR(30)  NOT NULL DEFAULT 'created',
  publish_marks  BOOLEAN      NOT NULL DEFAULT FALSE,
  taken_by       INT REFERENCES onec_users(id) ON DELETE SET NULL,
  created_by     INT REFERENCES onec_users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 3. Class targeting join table
CREATE TABLE IF NOT EXISTS onec_exam_cohorts (
  exam_id   INT NOT NULL REFERENCES onec_exams(id) ON DELETE CASCADE,
  cohort_id INT NOT NULL REFERENCES onec_cohorts(id) ON DELETE CASCADE,
  PRIMARY KEY (exam_id, cohort_id)
);

-- 4. Specific-student targeting join table
CREATE TABLE IF NOT EXISTS onec_exam_target_students (
  exam_id    INT NOT NULL REFERENCES onec_exams(id) ON DELETE CASCADE,
  learner_id INT NOT NULL REFERENCES onec_learners(id) ON DELETE CASCADE,
  PRIMARY KEY (exam_id, learner_id)
);

-- 5. Submissions / grades table
CREATE TABLE IF NOT EXISTS onec_exam_submissions (
  id              SERIAL PRIMARY KEY,
  exam_id         INT          NOT NULL REFERENCES onec_exams(id) ON DELETE CASCADE,
  learner_id      INT          NOT NULL REFERENCES onec_learners(id) ON DELETE CASCADE,
  score_obtained  NUMERIC,
  grade_value     TEXT,
  feedback        TEXT,
  submission_text TEXT,
  status          VARCHAR(20)  NOT NULL DEFAULT 'pending',
  graded_by       INT REFERENCES onec_users(id),
  graded_at       TIMESTAMPTZ,
  submitted_at    TIMESTAMPTZ,
  UNIQUE (exam_id, learner_id)
);

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_onec_exams_created_by   ON onec_exams(created_by);
CREATE INDEX IF NOT EXISTS idx_onec_exams_taken_by     ON onec_exams(taken_by);
CREATE INDEX IF NOT EXISTS idx_onec_exams_exam_date    ON onec_exams(exam_date);
CREATE INDEX IF NOT EXISTS idx_onec_exam_cohorts_exam  ON onec_exam_cohorts(exam_id);
CREATE INDEX IF NOT EXISTS idx_onec_exam_submissions   ON onec_exam_submissions(exam_id, learner_id);

-- 7. Seed permissions for all roles (ON CONFLICT DO NOTHING makes this idempotent)
INSERT INTO onec_role_permissions (role, permission) VALUES
  ('admin',      'exams.view'),
  ('admin',      'exams.manage'),
  ('admin',      'exams.grade'),
  ('staff',      'exams.view'),
  ('staff',      'exams.manage'),
  ('staff',      'exams.grade'),
  ('instructor', 'exams.view'),
  ('instructor', 'exams.manage'),
  ('instructor', 'exams.grade'),
  ('learner',    'exams.view'),
  ('guardian',   'exams.view')
ON CONFLICT (role, permission) DO NOTHING;
