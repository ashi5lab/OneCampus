// Run migration 041 (Add Exams module + taken_by to assignments) for all
// existing tenants. Safe to re-run: all DDL uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../config/db');

const SCHEMA_NAME_RE = /^[a-zA-Z0-9_]+$/;
const migrationSql = fs.readFileSync(
  path.join(__dirname, '../migrations/041_add_exams.sql'),
  'utf-8'
);

async function run() {
  const tenants = await db.query('SELECT domain, schema_name FROM public.onec_tenants');

  for (const tenant of tenants.rows) {
    if (!SCHEMA_NAME_RE.test(tenant.schema_name)) {
      console.error(`Skipping ${tenant.domain}: unsafe schema name`);
      continue;
    }

    const client = await db.getPool().connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET search_path TO "${tenant.schema_name}"`);
      await client.query(migrationSql);
      await client.query('COMMIT');
      console.log(`✓ Migration 041 applied to ${tenant.domain} (${tenant.schema_name})`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`✗ Failed for ${tenant.domain} (${tenant.schema_name}):`, err.message);
    } finally {
      client.release();
    }
  }

  db.getPool().end();
}

run()
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration runner failed:', err.message);
    process.exit(1);
  });
