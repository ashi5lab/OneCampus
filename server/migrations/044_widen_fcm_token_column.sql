-- Migration 044: Widen onec_fcm_tokens.token from VARCHAR(255) to TEXT
--
-- Native Capacitor/FCM Android registration tokens are not guaranteed to
-- fit Google's own historical ~152-163 char web-push token length — the
-- format is undocumented and Google explicitly says not to assume a fixed
-- size. A token longer than 255 chars makes the INSERT in
-- server/modules/profile/controller.js#saveFcmToken fail outright
-- ("value too long for type character varying(255)"), so the native
-- device's token would silently never persist to onec_fcm_tokens while a
-- same-length-safe web token for the same user saves fine — see
-- AGENT_LOG.md Entry 042.

ALTER TABLE onec_fcm_tokens ALTER COLUMN token TYPE TEXT;
