require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('../config/db');

// Idempotent bootstrap for the platform's super admin account. Run once
// after applying migrations/005_*.sql:
//   node server/scripts/seedSuperAdmin.js [username] [password]
// Defaults to admin/admin per the spec's "login as super user (admin/admin)"
// bootstrap credential — change the password from the super admin UI once
// tenant management is built out further.
async function seed(username = 'admin', password = 'admin') {
  const hash = await bcrypt.hash(password, 10);
  const result = await db.query(
    `INSERT INTO public.onec_super_admins (username, password_hash)
     VALUES ($1, $2)
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id, username`,
    [username, hash]
  );
  console.log('Super admin ready:', result.rows[0]);
}

if (require.main === module) {
  const [username, password] = process.argv.slice(2);
  seed(username, password)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Failed to seed super admin:', err.message);
      process.exit(1);
    });
}

module.exports = seed;
