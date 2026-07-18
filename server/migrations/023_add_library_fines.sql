-- Per-tenant-schema migration. Run inside each existing tenant's schema —
-- new tenants get this automatically via server/scripts/tenant_schema.sql.
-- Backs the overdue-fine calculation added to server/modules/library.

-- The raw fine amount itself is computed on read (see
-- server/lib/libraryFines.js), from due_date/returned_date and a fixed
-- per-day rate — not stored, so it's always correct without a background
-- job to keep it in sync. Only a waiver — an explicit staff action — needs
-- to persist, since it has to survive independently of that live
-- calculation (a live recompute would otherwise silently erase it).
ALTER TABLE onec_library_loans
  ADD COLUMN IF NOT EXISTS fine_waived_amount DECIMAL(8,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fine_waived_reason VARCHAR(255),
  ADD COLUMN IF NOT EXISTS fine_waived_by INT REFERENCES onec_users(id),
  ADD COLUMN IF NOT EXISTS fine_waived_at TIMESTAMP;
