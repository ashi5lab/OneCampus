-- Per-tenant-schema migration. Run inside each existing tenant's schema —
-- new tenants get this automatically via server/scripts/tenant_schema.sql.
-- Backs two additions to server/modules/broadcast:
--
-- 1. body_encoding lets a channel's Configuration describe a provider that
--    expects a form-urlencoded POST body instead of JSON (e.g. Twilio's
--    Messages API) — see server/lib/broadcastDispatch.js's dispatchOne.
--    Defaults to 'json' so every existing config keeps working unchanged.
--
-- 2. absentee_mode/absentee_schedule_time/absentee_schedule_day/
--    absentee_last_sent_date are only meaningful on the whatsapp_absentee
--    channel's row — replaces the old "always fires instantly on every
--    absence" behavior with an explicit choice: 'manual' (a button in the
--    Broadcast UI batches today's absentees into one test send),
--    'daily' (fires once at absentee_schedule_time), or 'weekly' (fires
--    once on absentee_schedule_day at absentee_schedule_time). See
--    server/lib/absenteeDigest.js and server/lib/absenteeScheduler.js.
ALTER TABLE onec_broadcast_configs
  ADD COLUMN IF NOT EXISTS body_encoding VARCHAR(10) NOT NULL DEFAULT 'json',
  ADD COLUMN IF NOT EXISTS absentee_mode VARCHAR(10) NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS absentee_schedule_time TIME,
  ADD COLUMN IF NOT EXISTS absentee_schedule_day INT,
  ADD COLUMN IF NOT EXISTS absentee_last_sent_date DATE;
