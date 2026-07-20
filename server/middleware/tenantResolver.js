const db = require('../config/db');

// status = 'approved' excludes tenants still pending super admin review (or
// declined) — their schema doesn't exist yet, so resolving them here would
// otherwise surface as a confusing 500 from a later query instead of a
// clean "not found".
const APPROVED_ACTIVE_TENANT_QUERY =
  "SELECT * FROM public.onec_tenants WHERE %COLUMN% = $1 AND is_active = true AND status = 'approved'";

// The login page no longer asks for a tenant domain — every username is
// "<tenant prefix>_<local part>" (see server/lib/credentials.js), so the
// login request alone carries everything needed to resolve its tenant.
// Only attempted for POST /auth/login (relative to this middleware's /api/v1
// mount) with a body that actually looks prefixed; every other route keeps
// resolving from the X-Tenant-Domain header/Host exactly as before — the
// frontend caches the domain returned by a successful login (see
// client/src/lib/apiClient.js's setTenantDomain) and sends it on every
// subsequent request, so nothing downstream of login needs to change.
async function resolveTenantFromUsernamePrefix(req) {
  if (req.method !== 'POST' || req.path !== '/auth/login') return null;

  const username = req.body?.username;
  if (typeof username !== 'string' || !username.includes('_')) return null;

  const prefix = username.slice(0, username.indexOf('_'));
  if (!prefix) return null;

  const result = await db.query(APPROVED_ACTIVE_TENANT_QUERY.replace('%COLUMN%', 'prefix'), [prefix]);
  return result.rows[0] || null;
}

async function tenantResolver(req, res, next) {
  try {
    let tenant = await resolveTenantFromUsernamePrefix(req);

    if (!tenant) {
      // Try to resolve tenant from Host header or a custom header for testing
      const host = req.headers.host || '';
      const domain = host.split(':')[0]; // remove port if any

      // During local testing, we might want to pass an explicit tenant header
      const tenantDomain = req.headers['x-tenant-domain'] || domain;

      const result = await db.query(APPROVED_ACTIVE_TENANT_QUERY.replace('%COLUMN%', 'domain'), [tenantDomain]);
      tenant = result.rows[0] || null;
    }

    if (!tenant) {
      // If this is a global route, we could skip. For now, require tenant.
      return res.status(404).json({ error: 'Tenant not found or inactive' });
    }

    req.tenantConfig = tenant;

    // Attach the schema name so routes can use it.
    // In database access patterns, we must enforce this schema for queries.
    req.tenantSchema = tenant.schema_name;

    next();
  } catch (error) {
    console.error('Tenant resolution error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = tenantResolver;
