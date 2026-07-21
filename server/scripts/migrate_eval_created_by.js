require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    const res = await pool.query("SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'");
    for (const row of res.rows) {
      const schema = row.schema_name;
      console.log(`Migrating schema ${schema}...`);
      await pool.query(`
        ALTER TABLE ${schema}.onec_evaluations ADD COLUMN IF NOT EXISTS created_by INT REFERENCES ${schema}.onec_users(id);
      `);
      console.log(`Done for ${schema}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
