// One-off retrofit for tenants provisioned before login switched from
// "typed-in tenant domain + username" to "username alone, tenant resolved
// from its prefix" (see server/middleware/tenantResolver.js). Must run
// AFTER server/migrations/031_add_tenant_prefix.sql has been applied (every
// tenant needs a `prefix` before this can use it).
//
// Renames every onec_users.username in every tenant schema to
// "<tenant prefix>_<existing username>" — idempotent (skips any username
// that already starts with that tenant's prefix, so re-running is safe).
// This is a real, user-visible change: everyone's login username changes.
// Deliberately NOT run automatically by any migration — run it yourself
// when you're ready to tell users their new username (see HANDOFF.md).
require('dotenv').config();
const db = require('../config/db');

const SCHEMA_NAME_RE = /^[a-zA-Z0-9_]+$/;

async function run() {
  const tenants = await db.query('SELECT domain, schema_name, prefix FROM public.onec_tenants');

  for (const tenant of tenants.rows) {
    if (!SCHEMA_NAME_RE.test(tenant.schema_name)) {
      console.error(`Skipping ${tenant.domain}: unsafe schema name`);
      continue;
    }
    if (!tenant.prefix) {
      console.error(`Skipping ${tenant.domain}: no prefix set — run migration 031 first`);
      continue;
    }

    const client = await db.getPool().connect();
    try {
      await client.query(`SET search_path TO "${tenant.schema_name}"`);
      // starts_with(), not LIKE — LIKE's '_' is a single-character wildcard,
      // not a literal underscore, so `LIKE prefix || '_%'` would also match
      // (and wrongly skip) e.g. prefix 'qs' against a pre-existing username
      // like 'qsxadmin'.
      const result = await client.query(
        `UPDATE onec_users
           SET username = $1 || '_' || username
         WHERE NOT starts_with(username, $1 || '_')
         RETURNING id, username`,
        [tenant.prefix]
      );
      console.log(`${tenant.domain} (${tenant.schema_name}): renamed ${result.rows.length} username(s) to prefix "${tenant.prefix}_"`);
    } catch (err) {
      console.error(`Failed for ${tenant.domain}:`, err.message);
    } finally {
      client.release();
    }
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('retrofitUsernamePrefixes failed:', err.message);
    process.exit(1);
  });
