const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../config/db');

async function provisionTenant({ domain, name, type }) {
  let activeModules = [];

  if (type === 'kindergarten') {
    activeModules = ['attendance', 'kindergarten_activity', 'messaging'];
  } else if (type === 'school') {
    activeModules = ['attendance', 'exams', 'marks', 'messaging', 'certificates'];
  } else if (type === 'college') {
    activeModules = ['attendance', 'exams', 'marks', 'course_credits', 'certificates'];
  } else {
    throw new Error('Invalid institution type. Must be kindergarten, school, or college.');
  }

  const config = {
    active_modules: activeModules,
    branding: { primaryColor: '#4f46e5', logoUrl: '/logo.png' },
    vocabulary_override: {}
  };

  const schemaName = `tenant_${domain.replace(/[^a-zA-Z0-9]/g, '_')}`;
  if (!/^[a-zA-Z0-9_]+$/.test(schemaName)) {
    throw new Error('Generated schema name contains unsafe characters.');
  }

  const client = await db.getPool().connect();

  try {
    await client.query('BEGIN');

    // 1. Insert into public.onec_tenants
    const insertTenantText = `
      INSERT INTO public.onec_tenants (domain, schema_name, org_name, org_type, config)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id;
    `;
    const insertTenantValues = [domain, schemaName, name, type, config];
    await client.query(insertTenantText, insertTenantValues);

    // 2. CREATE SCHEMA <schemaName>
    await client.query(`CREATE SCHEMA "${schemaName}"`);

    // 3. Run the schema DDL inside that schema
    const schemaSqlPath = path.join(__dirname, 'tenant_schema.sql');
    const schemaSql = fs.readFileSync(schemaSqlPath, 'utf-8');

    // Set search_path to only this schema to ensure tables are created there
    await client.query(`SET search_path TO "${schemaName}"`);
    
    // Execute DDL
    await client.query(schemaSql);

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
