// Generic migration runner for all existing tenants.
// Usage: node server/scripts/run_migration.js 042_learners_update_picture_permission.sql
// Safe to re-run for any migration whose SQL is itself idempotent
// (IF NOT EXISTS / ON CONFLICT DO NOTHING), which is the house style —
// see server/migrations/*.sql.
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../config/db');

const SCHEMA_NAME_RE = /^[a-zA-Z0-9_]+$/;

const fileName = process.argv[2];
if (!fileName) {
  console.error('Usage: node server/scripts/run_migration.js <migration-file.sql>');
  process.exit(1);
}

const migrationSql = fs.readFileSync(path.join(__dirname, '../migrations', fileName), 'utf-8');

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
      console.log(`✓ ${fileName} applied to ${tenant.domain} (${tenant.schema_name})`);
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
