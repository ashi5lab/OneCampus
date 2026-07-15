const db = require('../config/db');

const SCHEMA_NAME_RE = /^[a-zA-Z0-9_]+$/;

// onec_refresh_tokens only ever grows: every login/refresh inserts a row,
// and rotation marks the old row revoked rather than deleting it (see
// lib/refreshTokens.js) — nothing before this purged old rows. Expired
// rows are useless the moment they expire; revoked rows are kept for a
// short grace period (long enough to investigate a stolen/replayed
// token) before being purged too.
const REVOKED_RETENTION_DAYS = 1;

// Iterates every tenant schema, same pattern as the seed*ForExistingTenants
// scripts — there's no single cross-tenant refresh-token table to sweep.
async function cleanupExpiredRefreshTokens() {
  const tenants = await db.query('SELECT domain, schema_name FROM public.onec_tenants');
  let totalDeleted = 0;

  for (const tenant of tenants.rows) {
    if (!SCHEMA_NAME_RE.test(tenant.schema_name)) {
      console.error(`[refreshTokenCleanup] Skipping ${tenant.domain}: unsafe schema name`);
      continue;
    }

    const client = await db.getPool().connect();
    try {
      await client.query(`SET search_path TO "${tenant.schema_name}"`);
      const result = await client.query(
        `DELETE FROM onec_refresh_tokens
         WHERE expires_at < NOW()
            OR (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '${REVOKED_RETENTION_DAYS} days')`
      );
      totalDeleted += result.rowCount;
    } catch (err) {
      console.error(`[refreshTokenCleanup] Failed for ${tenant.domain}:`, err.message);
    } finally {
      client.release();
    }
  }

  return totalDeleted;
}

// Runs once immediately, then every intervalMs — called once from
// server.js at startup. Errors are caught per-run so one bad cycle
// doesn't kill the interval.
function scheduleRefreshTokenCleanup(intervalMs) {
  const run = () => {
    cleanupExpiredRefreshTokens()
      .then((count) => {
        if (count > 0) console.log(`[refreshTokenCleanup] Purged ${count} expired/revoked refresh token row(s).`);
      })
      .catch((err) => console.error('[refreshTokenCleanup] Run failed:', err.message));
  };

  run();
  return setInterval(run, intervalMs);
}

module.exports = { cleanupExpiredRefreshTokens, scheduleRefreshTokenCleanup };
