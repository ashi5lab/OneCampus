require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    const res = await pool.query('SELECT schema_name, prefix, domain FROM public.onec_tenants');
    console.log('Tenants:', res.rows);
    
    for (const tenant of res.rows) {
      const users = await pool.query(`SELECT username, role, is_active FROM ${tenant.schema_name}.onec_users`);
      console.log(`Users in ${tenant.schema_name}:`, users.rows);
    }
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
