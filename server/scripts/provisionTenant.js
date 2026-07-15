const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../config/db');
const { seedDefaultPermissions } = require('../lib/permissions');
const { defaultConfigForOrgType, schemaNameForDomain } = require('../lib/moduleDefaults');

// Creates the Postgres schema for a tenant and runs the DDL + default
// permission seed inside it. Shared by the CLI flow below (which also
// inserts the public.onec_tenants row itself) and
// server/modules/platform/controller.js's tenant-approval flow (where the
// onec_tenants row already exists, created 'pending' at registration time —
// only the schema itself is created here, on approval).
//
// `client` must already be inside a transaction the caller controls.
async function provisionSchema(client, schemaName) {
  await client.query(`CREATE SCHEMA "${schemaName}"`);

  const schemaSqlPath = path.join(__dirname, 'tenant_schema.sql');
  const schemaSql = fs.readFileSync(schemaSqlPath, 'utf-8');

  // Set search_path to only this schema to ensure tables are created there
  await client.query(`SET search_path TO "${schemaName}"`);
  await client.query(schemaSql);

  await seedDefaultPermissions(client);
}

async function provisionTenant({ domain, name, type }) {
  const config = defaultConfigForOrgType(type);
  const schemaName = schemaNameForDomain(domain);

  const client = await db.getPool().connect();

  try {
    await client.query('BEGIN');

    // 1. Insert into public.onec_tenants
    const insertTenantText = `
      INSERT INTO public.onec_tenants (domain, schema_name, org_name, org_type, config, status, provisioned_at)
      VALUES ($1, $2, $3, $4, $5, 'approved', CURRENT_TIMESTAMP)
      RETURNING id;
    `;
    const insertTenantValues = [domain, schemaName, name, type, config];
    await client.query(insertTenantText, insertTenantValues);

    // 2-4. Create schema, run DDL, seed default permissions
    await provisionSchema(client, schemaName);

    await client.query('COMMIT');
    console.log(`Successfully provisioned tenant: ${domain} (Schema: ${schemaName})`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to provision tenant, rolling back:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Simple CLI execution support
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.log('Usage: node provisionTenant.js <domain> <org_name> <org_type>');
    process.exit(1);
  }
  const [domain, name, type] = args;
  provisionTenant({ domain, name, type })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('provisionTenant failed:', err.message);
      process.exit(1);
    });
}

module.exports = provisionTenant;
module.exports.provisionSchema = provisionSchema;
