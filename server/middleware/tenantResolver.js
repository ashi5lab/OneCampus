const db = require('../config/db');

async function tenantResolver(req, res, next) {
  // Try to resolve tenant from Host header or a custom header for testing
  const host = req.headers.host || '';
  const domain = host.split(':')[0]; // remove port if any
  
  // During local testing, we might want to pass an explicit tenant header
  const tenantDomain = req.headers['x-tenant-domain'] || domain;

  try {
    const result = await db.query('SELECT * FROM public.onec_tenants WHERE domain = $1 AND is_active = true', [tenantDomain]);
    
    if (result.rows.length === 0) {
      // If this is a global route, we could skip. For now, require tenant.
      return res.status(404).json({ error: 'Tenant not found or inactive' });
    }

    const tenant = result.rows[0];
    req.tenantConfig = tenant;

    // Attach the schema name so routes can use it.
    // In database access patterns, we must enforce this schema for queries.
    req.tenantSchema = tenant.schema_name;

    next();
  } catch (error) {
    console.error('Tenant resolution error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = tenantResolver;
