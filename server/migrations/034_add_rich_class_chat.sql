-- Rich class chat: edit history, reactions, pinning, soft-delete, and
-- attachment metadata for onec_class_posts/onec_class_post_replies
-- (migration 033). Message bodies already store sanitized HTML (see
-- server/lib/richText.js) so no column type change is needed for
-- formatting/mentions.
-- NOT auto-run — apply manually to each tenant schema, same as every prior
-- migration in this directory.

ALTER TABLE onec_class_posts
    ADD COLUMN is_edited BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN deleted_at TIMESTAMP,
    ADD COLUMN deleted_by INT REFERENCES onec_users(id),
    ADD COLUMN pinned_at TIMESTAMP,
    ADD COLUMN pinned_by INT REFERENCES onec_users(id),
    ADD COLUMN attachment_url TEXT,
    ADD COLUMN attachment_name TEXT,
    ADD COLUMN attachment_size INT,
    ADD COLUMN attachment_type VARCHAR(20);

ALTER TABLE onec_class_post_replies
    ADD COLUMN is_edited BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN deleted_at TIMESTAMP,
    ADD COLUMN deleted_by INT REFERENCES onec_users(id),
    ADD COLUMN attachment_url TEXT,
    ADD COLUMN attachment_name TEXT,
    ADD COLUMN attachment_size INT,
    ADD COLUMN attachment_type VARCHAR(20);

-- One row per prior version of a message — never overwritten, so this is
-- also the moderation-log trail for "what did this used to say" (see the
-- edit-history endpoints, moderator-only per server/lib/cohortAccess.js).
CREATE TABLE onec_class_message_edits (
    id SERIAL PRIMARY KEY,
    message_type VARCHAR(10) NOT NULL, -- 'post' | 'reply'
    message_id INT NOT NULL,
    previous_body TEXT NOT NULL,
    edited_by INT REFERENCES onec_users(id),
    edited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_class_message_edits_lookup ON onec_class_message_edits(message_type, message_id);

-- One reaction per user per message (re-reacting with a different emoji
-- replaces it, matching Teams/Slack) — see PUT .../reaction.
CREATE TABLE onec_class_message_reactions (
    id SERIAL PRIMARY KEY,
    message_type VARCHAR(10) NOT NULL, -- 'post' | 'reply'
    message_id INT NOT NULL,
    user_id INT NOT NULL REFERENCES onec_users(id) ON DELETE CASCADE,
    emoji VARCHAR(8) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_type, message_id, user_id)
);
CREATE INDEX idx_class_message_reactions_lookup ON onec_class_message_reactions(message_type, message_id);
