-- Public-schema migration: replaces the login page's typed-in "Tenant
-- Domain" field with a short prefix baked into every username instead
-- (e.g. 'qs_adam2345') — see server/middleware/tenantResolver.js, which
-- now resolves the tenant for POST /auth/login purely from the username's
-- prefix. `domain` itself is untouched and still used for everything else
-- (JWT claim, the X-Tenant-Domain header on every request after login).
--
-- Additive and idempotent. Existing rows get a prefix auto-derived from
-- their domain's first label (e.g. domain 'qschool.onecampus.local' ->
-- prefix 'qschool', truncated/deduped as needed) so nothing breaks before
-- server/scripts/retrofitUsernamePrefixes.js (run separately, per tenant
-- schema) actually renames that tenant's usernames to match.
ALTER TABLE public.onec_tenants
  ADD COLUMN IF NOT EXISTS prefix VARCHAR(10);

-- Backfill only rows with no prefix yet — derived from the domain's first
-- label, lowercased, alphanumeric-only, capped at 6 chars, with a numeric
-- suffix appended on collision so uniqueness always succeeds.
DO $$
DECLARE
  t RECORD;
  base_prefix TEXT;
  candidate TEXT;
  suffix INT;
BEGIN
  FOR t IN SELECT id, domain FROM public.onec_tenants WHERE prefix IS NULL ORDER BY id LOOP
    base_prefix := substring(regexp_replace(lower(split_part(t.domain, '.', 1)), '[^a-z0-9]', '', 'g') FROM 1 FOR 6);
    IF base_prefix = '' THEN
      base_prefix := 'org' || t.id;
    END IF;

    candidate := base_prefix;
    suffix := 1;
    WHILE EXISTS (SELECT 1 FROM public.onec_tenants WHERE prefix = candidate) LOOP
      suffix := suffix + 1;
      candidate := substring(base_prefix FROM 1 FOR 5) || suffix;
    END LOOP;

    UPDATE public.onec_tenants SET prefix = candidate WHERE id = t.id;
  END LOOP;
END $$;

ALTER TABLE public.onec_tenants
  ALTER COLUMN prefix SET NOT NULL;

DROP INDEX IF EXISTS onec_tenants_prefix_idx;
CREATE UNIQUE INDEX onec_tenants_prefix_idx ON public.onec_tenants (prefix);
