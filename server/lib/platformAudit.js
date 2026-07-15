const db = require('../config/db');

// Cross-tenant counterpart to lib/audit.js — that one writes to a tenant
// schema's onec_audit_logs via req.db, which doesn't exist for platform
// routes (they run before tenantResolver/tenantDb). Writes to the shared
// pool's public schema instead. Never throws — a failed audit write must
// not fail the action it's logging.
async function logPlatformAudit(req, action, tenantId, details = {}) {
  try {
    await db.query(
      'INSERT INTO public.onec_platform_audit_logs (super_admin_id, action, tenant_id, details) VALUES ($1, $2, $3, $4)',
      [req.superAdmin?.superAdminId ?? null, action, tenantId ?? null, details]
    );
  } catch (err) {
    console.error('Failed to write platform audit log:', action, err.message);
  }
}

module.exports = { logPlatformAudit };
