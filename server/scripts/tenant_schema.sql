-- Users
CREATE TABLE onec_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,  -- 'admin', 'staff', 'instructor', 'learner', 'guardian'
    is_active BOOLEAN DEFAULT TRUE,
    profile_picture_url VARCHAR(500),  -- Cloudinary secure_url, see server/lib/cloudinary.js
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Structural units (Department, Faculty, Wing)
CREATE TABLE onec_units (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    head_user_id INT REFERENCES onec_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cohorts: Class (school) / Course Section (college) / Playgroup (kindergarten)
CREATE TABLE onec_cohorts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    unit_id INT REFERENCES onec_units(id),
    time_block VARCHAR(20) NOT NULL,   -- '2026-2027' or 'Fall Semester 2026'
    advisor_id INT REFERENCES onec_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Modules: Subject (school) / Course (college) / Activity (kindergarten)
CREATE TABLE onec_modules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    unit_id INT REFERENCES onec_units(id),
    credits INT DEFAULT 0
);

CREATE TABLE onec_instructors (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE REFERENCES onec_users(id) ON DELETE CASCADE,
    staff_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    meta JSONB DEFAULT '{}'
);

CREATE TABLE onec_guardians (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE REFERENCES onec_users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    meta JSONB DEFAULT '{}'
);

CREATE TABLE onec_learners (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE REFERENCES onec_users(id) ON DELETE CASCADE,
    registry_no VARCHAR(50) UNIQUE NOT NULL,   -- admission/roll number
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    cohort_id INT REFERENCES onec_cohorts(id),
    status VARCHAR(20) DEFAULT 'active',
    meta JSONB DEFAULT '{}'                    -- allergies, majors, credit limits, etc.
);

CREATE TABLE onec_learner_guardian_map (
    learner_id INT REFERENCES onec_learners(id) ON DELETE CASCADE,
    guardian_id INT REFERENCES onec_guardians(id) ON DELETE CASCADE,
    PRIMARY KEY (learner_id, guardian_id)
);

CREATE TABLE onec_allocations (
    id SERIAL PRIMARY KEY,
    cohort_id INT REFERENCES onec_cohorts(id) ON DELETE CASCADE,
    module_id INT REFERENCES onec_modules(id) ON DELETE CASCADE,
    instructor_id INT REFERENCES onec_instructors(id) ON DELETE CASCADE,
    schedule_data JSONB NOT NULL,   -- { days: ["Monday"], hour: "09:00-10:00" }
    time_block VARCHAR(20) NOT NULL
);

CREATE TABLE onec_attendance (
    id SERIAL PRIMARY KEY,
    learner_id INT REFERENCES onec_learners(id) ON DELETE CASCADE,
    cohort_id INT REFERENCES onec_cohorts(id) ON DELETE CASCADE,
    allocation_id INT REFERENCES onec_allocations(id),  -- null for daily, set for hour-based
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,   -- 'present', 'absent', 'late', 'excused'
    remarks VARCHAR(255),
    marked_by INT REFERENCES onec_users(id),
    UNIQUE(learner_id, date, allocation_id)
);

CREATE TABLE onec_evaluations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    time_block VARCHAR(20) NOT NULL,
    type VARCHAR(50) NOT NULL   -- 'exam', 'activity_log', 'project'
);

CREATE TABLE onec_evaluation_schedules (
    id SERIAL PRIMARY KEY,
    evaluation_id INT REFERENCES onec_evaluations(id) ON DELETE CASCADE,
    module_id INT REFERENCES onec_modules(id) ON DELETE CASCADE,
    eval_date DATE NOT NULL,
    max_score DECIMAL(5,2) DEFAULT 100.0,
    passing_score DECIMAL(5,2) DEFAULT 40.0
);

CREATE TABLE onec_learner_scores (
    id SERIAL PRIMARY KEY,
    eval_schedule_id INT REFERENCES onec_evaluation_schedules(id) ON DELETE CASCADE,
    learner_id INT REFERENCES onec_learners(id) ON DELETE CASCADE,
    score_obtained DECIMAL(5,2) NOT NULL,
    remarks VARCHAR(255),
    graded_by INT REFERENCES onec_users(id)
);

CREATE TABLE onec_kindergarten_daily_activity (
    id SERIAL PRIMARY KEY,
    learner_id INT REFERENCES onec_learners(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    meal_intake VARCHAR(100),
    sleep_duration VARCHAR(50),
    activities TEXT[],
    logged_by INT REFERENCES onec_users(id)
);

-- Role -> permission mapping (Phase 7). Presence of a (role, permission) row
-- means that role has that permission for this tenant. Absence means it
-- doesn't — this is an allow-list, not a deny-list. Tenant-overridable: a
-- tenant admin can INSERT/DELETE rows here to customize a role's access
-- without any code change.
CREATE TABLE onec_role_permissions (
    id SERIAL PRIMARY KEY,
    role VARCHAR(50) NOT NULL,
    permission VARCHAR(100) NOT NULL,
    UNIQUE(role, permission)
);

-- Audit trail for sensitive actions (spec Part 11): grading, deletions, and
-- permission denials. user_id has no FK/ON DELETE CASCADE on purpose — a
-- log entry must survive the user who caused it being deleted.
CREATE TABLE onec_audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE onec_certificates (
    id SERIAL PRIMARY KEY,
    learner_id INT REFERENCES onec_learners(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,   -- 'transfer_certificate', 'conduct', 'degree'
    certificate_no VARCHAR(100) UNIQUE NOT NULL,
    issue_date DATE NOT NULL,
    issued_by INT REFERENCES onec_users(id),
    data JSONB NOT NULL
);

-- Refresh tokens (spec Part 11: short-lived access token + httpOnly-cookie
-- refresh token). Stores a hash of the token, never the raw value — same
-- principle as password_hash, so a DB leak alone doesn't yield usable
-- tokens. Rotated on every use (server/lib/refreshTokens.js): a refresh
-- marks the old row revoked and inserts a new one, it never just extends
-- the same row's expiry.
CREATE TABLE onec_refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES onec_users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
