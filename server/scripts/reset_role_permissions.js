require('dotenv').config();
const { getPool } = require('../config/db');
const { seedDefaultPermissions } = require('../lib/permissions');

async function resetRolePermissions() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const tenants = await pool.query('SELECT schema_name FROM public.onec_tenants');
    for (const row of tenants.rows) {
      const schema = row.schema_name;
      const SCHEMA_NAME_RE = /^[a-zA-Z0-9_]+$/;
      if (!SCHEMA_NAME_RE.test(schema)) continue;
      
      console.log(`Processing schema: ${schema}`);
      await client.query(`SET search_path TO "${schema}"`);
      await client.query('BEGIN');
      
      console.log('  Deleting existing permissions for non-admin roles...');
      await client.query("DELETE FROM onec_role_permissions WHERE role != 'admin'");
      
      console.log('  Seeding new default permissions...');
      await seedDefaultPermissions(client);
      
      await client.query('COMMIT');
    }
    console.log('Successfully reset role permissions across all tenants!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to reset role permissions:', err);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

resetRolePermissions();
