const db = require('../config/db');

const SCHEMA_NAME_RE = /^[a-zA-Z0-9_]+$/;

// Acquires a single dedicated pool client for the lifetime of this request and
// pins its search_path to the resolved tenant's schema. Controllers must query
// via req.db, not the shared pool — pool.query() checks out an arbitrary
// connection per call, so a separate "SET search_path" + "SELECT" pair can land
// on two different connections and silently read/write the wrong tenant.
async function tenantDb(req, res, next) {
  const schema = req.tenantSchema;
  if (!schema) return next();

  if (!SCHEMA_NAME_RE.test(schema)) {
    console.error('Refusing to use unsafe tenant schema name:', schema);
    return res.status(500).json({ error: 'Internal server error' });
  }

  let client;
  try {
    client = await db.getPool().connect();
    await client.query(`SET search_path TO "${schema}"`);
  } catch (err) {
    if (client) client.release();
    console.error('Failed to initialize tenant DB context:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  req.db = client;

  let released = false;
  const release = () => {
    if (!released) {
      released = true;
      client.release();
    }
  };
  res.on('finish', release);
  res.on('close', release);

  next();
}

module.exports = tenantDb;
