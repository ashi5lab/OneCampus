-- Per-tenant-schema migration. Run inside each existing tenant's schema —
-- new tenants get this automatically via server/scripts/tenant_schema.sql.
-- Backs the self-serve notification preferences section on the Profile
-- page (server/modules/profile) — no new permission needed, these are
-- always self-scoped to the caller's own row, same as changeOwnPassword.

-- Opt out of SMS/voicemail broadcast (server/modules/broadcast's
-- resolveRecipients). Defaults to false (opted in) since that's the
-- behavior every existing user already had — there was no opt-out
-- concept before this, so nothing should change for anyone until they
-- actively flip it off.
ALTER TABLE onec_users ADD COLUMN IF NOT EXISTS broadcast_opt_out BOOLEAN NOT NULL DEFAULT false;

-- onec_guardians.whatsapp_opt_in already existed (guardian WhatsApp
-- absentee-alert opt-in) but was only editable by staff/admin through the
-- Guardians roster page — this migration doesn't change that column, just
-- the profile module gains a self-serve endpoint that lets a guardian
-- update their own row's value directly.
