-- Class channel chat (Teams-style posts + threaded replies, one channel per
-- cohort) backing the new student/instructor/staff "Class" tab, and a
-- per-user JSONB column for which Home insight cards they want to see (null
-- means "show every card", the default — see server/lib/homeCardPrefs.js).
-- NOT auto-run — apply manually to each tenant schema, same as every prior
-- migration in this directory.

CREATE TABLE onec_class_posts (
    id SERIAL PRIMARY KEY,
    cohort_id INT NOT NULL REFERENCES onec_cohorts(id) ON DELETE CASCADE,
    author_id INT NOT NULL REFERENCES onec_users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE onec_class_post_replies (
    id SERIAL PRIMARY KEY,
    post_id INT NOT NULL REFERENCES onec_class_posts(id) ON DELETE CASCADE,
    author_id INT NOT NULL REFERENCES onec_users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_class_posts_cohort_created ON onec_class_posts(cohort_id, created_at);
CREATE INDEX idx_class_post_replies_post ON onec_class_post_replies(post_id);

ALTER TABLE onec_users ADD COLUMN IF NOT EXISTS home_card_prefs JSONB;
