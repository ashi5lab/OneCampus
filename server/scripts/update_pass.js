require('dotenv').config();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const hash = await bcrypt.hash('root', 10);
    
    // Find the tenant schema for prefix 'qs'
    const tenantRes = await pool.query("SELECT schema_name FROM public.onec_tenants WHERE prefix = 'qs'");
    if (tenantRes.rows.length === 0) {
      console.log("Tenant with prefix 'qs' not found.");
      return;
    }
    
    const schema = tenantRes.rows[0].schema_name;
    const res = await pool.query(`UPDATE ${schema}.onec_users SET password_hash = $1 WHERE username = 'qs_qschool'`, [hash]);
    
    if (res.rowCount > 0) {
      console.log(`Successfully updated password for qs_qschool in schema ${schema}.`);
    } else {
      console.log(`User qs_qschool not found in schema ${schema}.`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
