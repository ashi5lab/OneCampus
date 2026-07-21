require('dotenv').config();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    const hash = await bcrypt.hash('9797', 10);
    const result = await pool.query(
      'UPDATE public.onec_super_admins SET password_hash = $1 WHERE username = $2 RETURNING id',
      [hash, 'onec_admin']
    );
    console.log('Updated super admin password:', result.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
