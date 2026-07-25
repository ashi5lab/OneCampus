CREATE TABLE IF NOT EXISTS onec_cohort_attendance_logs (
    id SERIAL PRIMARY KEY,
    cohort_id INTEGER NOT NULL REFERENCES onec_cohorts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    marked_by INTEGER REFERENCES onec_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cohort_id, date)
);
