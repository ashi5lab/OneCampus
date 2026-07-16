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

-- Homework/assignments (see server/modules/assignments). Simpler than the
-- Evaluations module's evaluation+schedule split — one assignment IS the
-- specific task for one cohort/module, no separate "exam type" umbrella.
CREATE TABLE onec_assignments (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    module_id INT REFERENCES onec_modules(id) ON DELETE CASCADE,
    cohort_id INT REFERENCES onec_cohorts(id) ON DELETE CASCADE,
    due_date DATE NOT NULL,
    max_score DECIMAL(5,2) DEFAULT 100.0,
    created_by INT REFERENCES onec_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE onec_assignment_submissions (
    id SERIAL PRIMARY KEY,
    assignment_id INT REFERENCES onec_assignments(id) ON DELETE CASCADE,
    learner_id INT REFERENCES onec_learners(id) ON DELETE CASCADE,
    submission_text TEXT,
    submitted_at TIMESTAMP,
    score_obtained DECIMAL(5,2),
    feedback TEXT,
    graded_by INT REFERENCES onec_users(id),
    graded_at TIMESTAMP,
    UNIQUE(assignment_id, learner_id)
);

-- Library catalog + loans (see server/modules/library). borrower_id is any
-- onec_users row, not just onec_learners — staff/instructors borrow books
-- too, not only students.
CREATE TABLE onec_library_books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255),
    isbn VARCHAR(50),
    category VARCHAR(100),
    total_copies INT NOT NULL DEFAULT 1,
    available_copies INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE onec_library_loans (
    id SERIAL PRIMARY KEY,
    book_id INT REFERENCES onec_library_books(id) ON DELETE CASCADE,
    borrower_id INT REFERENCES onec_users(id) ON DELETE CASCADE,
    borrowed_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    returned_date DATE,
    issued_by INT REFERENCES onec_users(id)
);

-- School-wide announcements (see server/modules/notices). A core feature,
-- not gated by a module toggle like attendance/exams/messaging — every
-- institution type wants a notice board, unlike e.g. kindergarten_activity.
CREATE TABLE onec_notices (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    audience VARCHAR(20) NOT NULL DEFAULT 'all',  -- 'all', 'instructors', 'learners', 'guardians'
    posted_by INT REFERENCES onec_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Direct messages between two users (see server/modules/messages). No
-- broadcast/group messaging in v1 — recipient_id is always a single user.
CREATE TABLE onec_messages (
    id SERIAL PRIMARY KEY,
    sender_id INT REFERENCES onec_users(id) ON DELETE CASCADE,
    recipient_id INT REFERENCES onec_users(id) ON DELETE CASCADE,
    subject VARCHAR(255),
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Online exams (see server/modules/onlineExams). Distinct from Evaluations'
-- offline/paper exam score entry — a learner actually takes this exam
-- in-app. grading_type drives whether submit() auto-scores MCQ answers on
-- the spot or leaves them for a grader to score manually afterwards.
CREATE TABLE onec_online_exams (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    module_id INT REFERENCES onec_modules(id) ON DELETE CASCADE,
    cohort_id INT REFERENCES onec_cohorts(id) ON DELETE CASCADE,
    grading_type VARCHAR(20) NOT NULL DEFAULT 'manual', -- 'manual' | 'auto'
    duration_minutes INT NOT NULL DEFAULT 60,
    max_score DECIMAL(6,2) NOT NULL DEFAULT 0,
    published BOOLEAN NOT NULL DEFAULT false,
    published_at TIMESTAMP,
    created_by INT REFERENCES onec_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE onec_exam_questions (
    id SERIAL PRIMARY KEY,
    exam_id INT REFERENCES onec_online_exams(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) NOT NULL DEFAULT 'text', -- 'mcq' | 'text'
    options JSONB,        -- array of option strings, 'mcq' only
    correct_option INT,   -- index into options, 'mcq' only — never sent to non-managers
    max_score DECIMAL(6,2) NOT NULL DEFAULT 1,
    order_index INT NOT NULL DEFAULT 0
);

CREATE TABLE onec_exam_submissions (
    id SERIAL PRIMARY KEY,
    exam_id INT REFERENCES onec_online_exams(id) ON DELETE CASCADE,
    learner_id INT REFERENCES onec_learners(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress', -- 'in_progress' | 'submitted' | 'graded'
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP,
    total_score DECIMAL(6,2),
    graded_by INT REFERENCES onec_users(id), -- NULL when grading_type='auto' (system-graded)
    graded_at TIMESTAMP,
    UNIQUE(exam_id, learner_id)
);

CREATE TABLE onec_exam_answers (
    id SERIAL PRIMARY KEY,
    submission_id INT REFERENCES onec_exam_submissions(id) ON DELETE CASCADE,
    question_id INT REFERENCES onec_exam_questions(id) ON DELETE CASCADE,
    answer_text TEXT,
    selected_option INT,
    score_obtained DECIMAL(6,2),
    feedback TEXT,
    UNIQUE(submission_id, question_id)
);

-- Broadcast (SMS + voicemail) — see server/modules/broadcast. The actual
-- SMS/voice provider isn't integrated yet: each channel's outbound HTTP
-- call is fully described by a per-tenant config row (URL, method,
-- headers, payload/params templates with {{variable}} placeholders), so
-- wiring a real provider later is a config change, not a code change.
CREATE TABLE onec_broadcast_configs (
    id SERIAL PRIMARY KEY,
    channel VARCHAR(20) UNIQUE NOT NULL,               -- 'sms' | 'voicemail'
    api_url VARCHAR(500),
    http_method VARCHAR(10) NOT NULL DEFAULT 'POST',   -- 'POST' | 'GET'
    headers JSONB NOT NULL DEFAULT '{}',
    payload_template JSONB NOT NULL DEFAULT '{}',      -- POST body; values may contain {{variables}}
    params_template JSONB NOT NULL DEFAULT '{}',       -- GET query params; values may contain {{variables}}
    variables JSONB NOT NULL DEFAULT '{}',             -- static name -> value, substituted into the templates
    is_active BOOLEAN NOT NULL DEFAULT false,
    updated_by INT REFERENCES onec_users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE onec_broadcasts (
    id SERIAL PRIMARY KEY,
    channel VARCHAR(20) NOT NULL,                      -- 'sms' | 'voicemail'
    message TEXT,                                      -- SMS body
    voice_url VARCHAR(500),                            -- voicemail audio (Cloudinary)
    duration_seconds INT,
    -- voicemail: pending_approval -> approved | rejected, then -> sent
    -- sms: written as sent/failed directly (no approval step)
    status VARCHAR(30) NOT NULL DEFAULT 'pending_approval',
    audience_type VARCHAR(20),                         -- 'all' | 'cohort' | 'users'
    audience_ids JSONB,                                -- cohort ids or user ids, per audience_type
    send_result JSONB,                                 -- { sent, failed, skipped_no_phone, ... }
    created_by INT REFERENCES onec_users(id),
    approved_by INT REFERENCES onec_users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

-- Access Control (see server/modules/accessControl) — admin-defined named
-- groups of permissions, layered additively on top of onec_role_permissions
-- rather than replacing them. A group targets either every user of one role
-- (target_type='role') or an explicit set of individual users
-- (target_type='users', via onec_access_group_members). A user's effective
-- permission set is their role's onec_role_permissions rows UNION every
-- group that applies to them — see lib/permissions.js's hasPermission().
CREATE TABLE onec_access_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]',
    target_type VARCHAR(20) NOT NULL,   -- 'role' | 'users'
    target_role VARCHAR(50),            -- set when target_type = 'role'
    created_by INT REFERENCES onec_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE onec_access_group_members (
    group_id INT REFERENCES onec_access_groups(id) ON DELETE CASCADE,
    user_id INT REFERENCES onec_users(id) ON DELETE CASCADE,
    PRIMARY KEY (group_id, user_id)
);

-- Staff — a lighter-weight roster than instructors, for front-office/admin
-- support accounts (role='staff'). Deliberately its own table rather than
-- reusing onec_instructors, since a staff member isn't a teacher and
-- shouldn't show up anywhere instructors do (grading, allocations, ...).
CREATE TABLE onec_staff (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE REFERENCES onec_users(id) ON DELETE CASCADE,
    staff_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    meta JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leave applications (see server/modules/leave). applicant_role records
-- which of onec_instructors/onec_staff/onec_learners the applicant (user_id)
-- resolves to, rather than three nullable FK columns. Approval routing has
-- no stored approver column at all — it's resolved at read time from
-- onec_cohorts.advisor_id (the "class teacher") for learner applicants, and
-- from meta->>'designation' = 'principal'/'vice_principal' on onec_
-- instructors/onec_staff for tenant-wide approvers.
CREATE TABLE onec_leave_requests (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES onec_users(id) ON DELETE CASCADE,
    applicant_role VARCHAR(20) NOT NULL,           -- 'instructor' | 'staff' | 'learner'
    leave_type VARCHAR(20) NOT NULL,               -- 'personal' | 'sick'
    reason TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_half_day BOOLEAN NOT NULL DEFAULT false,
    half_day_period VARCHAR(10),                   -- 'first_half' | 'second_half', set only when is_half_day
    num_days DECIMAL(4,1) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected' | 'cancelled'
    reviewed_by INT REFERENCES onec_users(id),
    reviewed_at TIMESTAMP,
    review_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
