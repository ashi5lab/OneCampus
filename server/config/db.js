const { Pool } = require('pg');

// connectionTimeoutMillis matters more than it looks: without it, a
// pool.connect() call queues forever once all `max` connections are
// checked out, so every request needing req.db (via tenantDb middleware)
// hangs indefinitely instead of failing — a pool that's merely busy for a
// moment becomes a silent full outage. This turns that into a fast 500
// instead. (Found by reproducing exactly that hang during a heavy manual
// testing session — every route needing a DB connection stopped
// responding, with no error logged anywhere, until the server was
// restarted to reset the pool.)
const poolOptions = {
  connectionTimeoutMillis: 5000,
};

const pool = process.env.DATABASE_URL
  ? new Pool({
      ...poolOptions,
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    })
  : new Pool({
      ...poolOptions,
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'onecampus',
      password: process.env.DB_PASSWORD || 'postgres',
      port: process.env.DB_PORT || 5432,
    });

module.exports = {
  query: (text, params) => pool.query(text, params),
  getPool: () => pool,
};
