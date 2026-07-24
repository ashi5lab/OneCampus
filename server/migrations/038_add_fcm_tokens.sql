-- Up
CREATE TABLE onec_fcm_tokens (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES onec_users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL,
    device_info VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, token)
);

-- Down
DROP TABLE IF EXISTS onec_fcm_tokens;
