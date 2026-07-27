-- Create onec_notifications table for in-app notification center
-- Stores all notifications (in-app, push, etc.)
-- Separate from push delivery — users see these even without push enabled

CREATE TABLE IF NOT EXISTS onec_notifications (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES onec_users(id) ON DELETE CASCADE,
  type        VARCHAR(60) NOT NULL,  -- 'attendance' | 'notice' | 'discipline' | 'broadcast' | 'assignment' | 'exam' | 'message' | 'ptm' | etc.
  title       VARCHAR(255) NOT NULL,
  body        TEXT,
  url         VARCHAR(500),          -- deep link, e.g. /app/attendance
  data        JSONB,                 -- arbitrary metadata
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON onec_notifications (user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_date
  ON onec_notifications (user_id, created_at DESC);

-- Down (rollback)
-- DROP TABLE IF EXISTS onec_notifications;
