-- Extend onec_assignments with status lifecycle, eval type, multi-class,
-- specific-student targeting, and instructions.
ALTER TABLE onec_assignments
  ADD COLUMN IF NOT EXISTS status       VARCHAR(30)  NOT NULL DEFAULT 'created',
  ADD COLUMN IF NOT EXISTS eval_type    VARCHAR(20)  NOT NULL DEFAULT 'marks',
  ADD COLUMN IF NOT EXISTS passing_marks DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS pass_grade   VARCHAR(5),
  ADD COLUMN IF NOT EXISTS instructions TEXT,
  ADD COLUMN IF NOT EXISTS target_type  VARCHAR(20)  NOT NULL DEFAULT 'class';

-- Multi-class join: one assignment → many cohorts
CREATE TABLE IF NOT EXISTS onec_assignment_cohorts (
  assignment_id INT NOT NULL REFERENCES onec_assignments(id) ON DELETE CASCADE,
  cohort_id     INT NOT NULL REFERENCES onec_cohorts(id)     ON DELETE CASCADE,
  PRIMARY KEY (assignment_id, cohort_id)
);

-- Specific-student targeting: one assignment → specific learners (target_type='specific_students')
CREATE TABLE IF NOT EXISTS onec_assignment_target_students (
  assignment_id INT NOT NULL REFERENCES onec_assignments(id)  ON DELETE CASCADE,
  learner_id    INT NOT NULL REFERENCES onec_learners(id)     ON DELETE CASCADE,
  PRIMARY KEY (assignment_id, learner_id)
);

-- Migrate existing single cohort_id values into the join table
INSERT INTO onec_assignment_cohorts (assignment_id, cohort_id)
SELECT id, cohort_id
FROM   onec_assignments
WHERE  cohort_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Extend submissions: grade letter + pending/graded status
ALTER TABLE onec_assignment_submissions
  ADD COLUMN IF NOT EXISTS grade_value VARCHAR(5),
  ADD COLUMN IF NOT EXISTS status      VARCHAR(20) NOT NULL DEFAULT 'pending';

-- Back-fill existing graded submissions
UPDATE onec_assignment_submissions
SET    status = 'graded'
WHERE  score_obtained IS NOT NULL OR grade_value IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assignment_cohorts_assignment ON onec_assignment_cohorts (assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_cohorts_cohort     ON onec_assignment_cohorts (cohort_id);
CREATE INDEX IF NOT EXISTS idx_assignment_targets_assignment ON onec_assignment_target_students (assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status            ON onec_assignment_submissions (assignment_id, status);
