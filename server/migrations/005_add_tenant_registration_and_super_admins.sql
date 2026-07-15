-- Public-schema migration (self-serve tenant registration + super admin).
--
-- onec_tenants gains a review workflow: a self-registered tenant starts
-- 'pending' (schema not yet created — see server/scripts/provisionTenant.js's
-- provisionSchema()), and only becomes 'approved' (schema + admin user
-- provisioned) once a super admin reviews it via server/modules/platform.
-- Existing rows (provisioned via the CLI script) default to 'approved' so
-- they keep working unchanged.
ALTER TABLE public.onec_tenants
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS admin_username VARCHAR(100),
  ADD COLUMN IF NOT EXISTS admin_password_hash VARCHAR(255),
  ADD COLUMN IF NOT EXISTS decline_reason TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS provisioned_at TIMESTAMP;

ALTER TABLE public.onec_tenants
  DROP CONSTRAINT IF EXISTS onec_tenants_status_check;
ALTER TABLE public.onec_tenants
  ADD CONSTRAINT onec_tenants_status_check CHECK (status IN ('pending', 'approved', 'declined'));

-- Backfill: rows that already exist were provisioned directly (CLI script),
-- so their schema already exists — mark them provisioned as of creation.
UPDATE public.onec_tenants SET provisioned_at = created_at WHERE provisioned_at IS NULL;

-- Platform-level operators who approve/decline/manage tenant registrations.
-- Not tenant-scoped (lives in public schema), authenticated separately from
-- onec_users via server/modules/platform — see requireSuperAdmin middleware.
CREATE TABLE IF NOT EXISTS public.onec_super_admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lightweight audit trail for platform-level actions (approve/decline/
-- delete/edit a tenant) — mirrors the per-tenant onec_audit_logs pattern
-- (server/lib/audit.js) but lives in public since it's cross-tenant.
CREATE TABLE IF NOT EXISTS public.onec_platform_audit_logs (
    id SERIAL PRIMARY KEY,
    super_admin_id INT REFERENCES public.onec_super_admins(id),
    action VARCHAR(100) NOT NULL,
    tenant_id INT REFERENCES public.onec_tenants(id),
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
