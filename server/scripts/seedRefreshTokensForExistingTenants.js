// One-off retrofit for tenants provisioned before onec_refresh_tokens
// existed — new tenants get it automatically via provisionTenant.js.
// Safe to re-run: CREATE TABLE IF NOT EXISTS is idempotent.
require('dotenv').config();
const db = require('../config/db');

const SCHEMA_NAME_RE = /^[a-zA-Z0-9_]+$/;

async function run() {
  const tenants = await db.query('SELECT domain, schema_name FROM public.onec_tenants');

  for (const tenant of tenants.rows) {
    if (!SCHEMA_NAME_RE.test(tenant.schema_name)) {
      console.error(`Skipping ${tenant.domain}: unsafe schema name`);
      continue;
    }

    const client = await db.getPool().connect();
    try {
      await client.query(`SET search_path TO "${tenant.schema_name}"`);
      await client.query(`
        CREATE TABLE IF NOT EXISTS onec_refresh_tokens (
          id SERIAL PRIMARY KEY,
          user_id INT REFERENCES onec_users(id) ON DELETE CASCADE,
          token_hash VARCHAR(64) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          revoked_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log(`Created onec_refresh_tokens for ${tenant.domain} (${tenant.schema_name})`);
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
    console.error('seedRefreshTokensForExistingTenants failed:', err.message);
    process.exit(1);
  });
