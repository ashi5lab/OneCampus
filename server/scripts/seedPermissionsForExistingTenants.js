// One-off retrofit for tenants provisioned before the Phase 7 permissions
// system existed — new tenants get onec_role_permissions automatically via
// provisionTenant.js. Safe to re-run: CREATE TABLE IF NOT EXISTS + the
// seed's ON CONFLICT DO NOTHING make this idempotent.
require('dotenv').config();
const db = require('../config/db');
const { seedDefaultPermissions } = require('../lib/permissions');

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
        CREATE TABLE IF NOT EXISTS onec_role_permissions (
          id SERIAL PRIMARY KEY,
          role VARCHAR(50) NOT NULL,
          permission VARCHAR(100) NOT NULL,
          UNIQUE(role, permission)
        )
      `);
      await seedDefaultPermissions(client);
      console.log(`Seeded permissions for ${tenant.domain} (${tenant.schema_name})`);
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
    console.error('seedPermissionsForExistingTenants failed:', err.message);
    process.exit(1);
  });
