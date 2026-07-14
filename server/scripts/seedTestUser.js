require('dotenv').config();
const db = require('../config/db');
const bcrypt = require('bcrypt');

const SCHEMA_NAME_RE = /^[a-zA-Z0-9_]+$/;

async function seed(tenantSchema) {
  if (!SCHEMA_NAME_RE.test(tenantSchema)) {
    throw new Error('Invalid schema name.');
  }

  const client = await db.getPool().connect();
  try {
    await client.query(`SET search_path TO "${tenantSchema}"`);

    const plainPassword = 'password123';
    const hash = await bcrypt.hash(plainPassword, 10);

    const result = await client.query(
      `INSERT INTO onec_users (username, email, password_hash, role, is_active) VALUES ($1, $2, $3, $4, true) RETURNING id, username, role`,
      ['test_admin', 'test_admin@example.com', hash, 'admin']
    );

    console.log('Success! Test user created in schema:', tenantSchema);
    console.log('Username: test_admin');
    console.log('Password: password123');
    console.log('User Record:', result.rows[0]);
  } finally {
    client.release();
  }
}

const schema = process.argv[2];
if (!schema) {
  console.log('Usage: node seedTestUser.js <tenant_schema_name>');
  console.log('Example: node seedTestUser.js tenant_school_local');
  process.exit(1);
}

seed(schema)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error seeding user:', err.message);
    process.exit(1);
  });
