-- Per-tenant-schema migration. Run inside each existing tenant's schema —
-- new tenants get this automatically via server/scripts/tenant_schema.sql.
-- Backs the WhatsApp absentee-notification feature (server/lib/whatsappNotify.js).

-- WhatsApp is opt-in, not opt-out, per Meta's business-messaging policy —
-- defaults false, a staff member or the guardian themself must explicitly
-- turn it on before any automatic WhatsApp notification is sent to them.
ALTER TABLE onec_guardians
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN NOT NULL DEFAULT false;

-- No onec_broadcast_configs row is inserted here — 'whatsapp_absentee' is
-- just a new allowed value for the existing channel column (VARCHAR, no
-- CHECK constraint), configured the same way sms/voicemail already are
-- (an admin fills in the Configuration panel; see server/modules/broadcast).
