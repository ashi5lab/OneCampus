const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const db = require('../../config/db');
const { JWT_SECRET, TENANT_BASE_DOMAIN, SUPER_ADMIN_TOKEN_TTL } = require('../../config/env');
const { defaultConfigForOrgType, schemaNameForDomain } = require('../../lib/moduleDefaults');
const { provisionSchema } = require('../../scripts/provisionTenant');
const { logPlatformAudit } = require('../../lib/platformAudit');

const SCHEMA_NAME_RE = /^[a-zA-Z0-9_]+$/;

const registerSchema = z.object({
  org_name: z.string().min(2, 'Organization name is required'),
  org_type: z.enum(['kindergarten', 'school', 'college']),
  slug: z
    .string()
    .min(2, 'Subdomain must be at least 2 characters')
    .max(63, 'Subdomain is too long')
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers, and hyphens only'),
  contact_name: z.string().min(1, 'Contact name is required'),
  contact_phone: z.string().min(7, 'A valid phone number is required'),
  contact_email: z.string().email('A valid email is required'),
  admin_username: z.string().min(3, 'Admin username must be at least 3 characters'),
  admin_password: z.string().min(6, 'Password must be at least 6 characters')
});

// Public — a prospective tenant submits their details and a proposed admin
// login, then waits for super admin approval. The onec_users row for the
// admin isn't created yet (there's no schema to put it in); the password is
// hashed and held on the onec_tenants row until approveTenant() provisions
// the schema and creates the real user in one step.
async function register(req, res) {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { org_name, org_type, slug, contact_name, contact_phone, contact_email, admin_username, admin_password } =
      parsed.data;

    const domain = `${slug}.${TENANT_BASE_DOMAIN}`;
    const schemaName = schemaNameForDomain(domain);
    const config = defaultConfigForOrgType(org_type);
    const admin_password_hash = await bcrypt.hash(admin_password, 10);

    const result = await db.query(
      `INSERT INTO public.onec_tenants
         (domain, schema_name, org_name, org_type, config, status, contact_name, contact_email, contact_phone, admin_username, admin_password_hash)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8, $9, $10)
       RETURNING id, domain, org_name, org_type, status, created_at`,
      [domain, schemaName, org_name, org_type, config, contact_name, contact_email, contact_phone, admin_username, admin_password_hash]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('Tenant registration error:', err);
    if (err.code === '23505') return res.status(400).json({ error: 'That subdomain is already taken' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Public — lets a just-registered tenant poll whether they've been
// approved yet, by the domain they registered with, without needing to log
// in anywhere first (there's nowhere to log in to until they're approved).
async function getRegistrationStatus(req, res) {
  try {
    const { domain } = req.query;
    if (!domain || typeof domain !== 'string') {
      return res.status(400).json({ error: 'domain query parameter is required' });
    }

    const result = await db.query(
      'SELECT domain, org_name, status, decline_reason, created_at, reviewed_at FROM public.onec_tenants WHERE domain = $1',
      [domain]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'No registration found for that domain' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('Registration status lookup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

const superAdminLoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

async function superAdminLogin(req, res) {
  try {
    const parsed = superAdminLoginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });
    const { username, password } = parsed.data;

    const result = await db.query('SELECT * FROM public.onec_super_admins WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid username or password' });

    const admin = result.rows[0];
    const match = await bcrypt.compare(password, admin.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid username or password' });

    const token = jwt.sign(
      { superAdminId: admin.id, username: admin.username, scope: 'super_admin' },
      JWT_SECRET,
      { expiresIn: SUPER_ADMIN_TOKEN_TTL }
    );

    res.json({ data: { token, admin: { id: admin.id, username: admin.username } } });
  } catch (err) {
    console.error('Super admin login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function superAdminMe(req, res) {
  res.json({ data: { superAdminId: req.superAdmin.superAdminId, username: req.superAdmin.username } });
}

async function listTenants(req, res) {
  try {
    const { status } = req.query;
    const params = [];
    let query = `SELECT id, domain, org_name, org_type, status, is_active, contact_name, contact_email,
                        contact_phone, admin_username, decline_reason, created_at, reviewed_at, provisioned_at
                 FROM public.onec_tenants`;
    if (status) {
      params.push(status);
      query += ' WHERE status = $1';
    }
    query += ' ORDER BY created_at DESC';

    const result = await db.query(query, params);
    res.json({ data: result.rows });
  } catch (err) {
    console.error('List tenants error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Provisions the tenant's schema (created 'pending' at registration, with
// the schema name already reserved but not yet created) and creates its
// first admin user from the credentials submitted at registration.
async function approveTenant(req, res) {
  const { id } = req.params;
  const client = await db.getPool().connect();
  try {
    await client.query('BEGIN');

    const tenantRes = await client.query('SELECT * FROM public.onec_tenants WHERE id = $1 FOR UPDATE', [id]);
    if (tenantRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Tenant not found' });
    }
    const tenant = tenantRes.rows[0];

    if (tenant.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Tenant is already ${tenant.status}` });
    }
    if (!SCHEMA_NAME_RE.test(tenant.schema_name)) {
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'Tenant has an invalid schema name' });
    }

    await provisionSchema(client, tenant.schema_name);

    // provisionSchema pins the connection's search_path to the new schema,
    // so this unqualified insert lands in the tenant's onec_users table.
    await client.query(
      `INSERT INTO onec_users (username, email, password_hash, role) VALUES ($1, $2, $3, 'admin')`,
      [tenant.admin_username, tenant.contact_email, tenant.admin_password_hash]
    );

    const updated = await client.query(
      `UPDATE public.onec_tenants
         SET status = 'approved', reviewed_at = CURRENT_TIMESTAMP, provisioned_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, domain, org_name, org_type, status`,
      [id]
    );

    await client.query('COMMIT');
    await logPlatformAudit(req, 'tenant.approved', tenant.id, { domain: tenant.domain });
    res.json({ data: updated.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Tenant approval error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
}

const declineSchema = z.object({ reason: z.string().max(500).optional() });

async function declineTenant(req, res) {
  try {
    const { id } = req.params;
    const parsed = declineSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const result = await db.query(
      `UPDATE public.onec_tenants
         SET status = 'declined', decline_reason = $1, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND status = 'pending'
       RETURNING id, domain, org_name, status, decline_reason`,
      [parsed.data.reason ?? null, id]
    );
    if (result.rows.length === 0) return res.status(400).json({ error: 'Tenant not found or not pending' });

    await logPlatformAudit(req, 'tenant.declined', id, { reason: parsed.data.reason });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('Tenant decline error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

const updateSchema = z
  .object({
    org_name: z.string().min(1).optional(),
    contact_name: z.string().min(1).optional(),
    contact_email: z.string().email().optional(),
    contact_phone: z.string().min(7).optional(),
    is_active: z.boolean().optional()
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });

// keys always come from updateSchema's fixed field list (zod strips unknown
// keys by default), so interpolating them into the SET clause is safe.
async function updateTenant(req, res) {
  try {
    const { id } = req.params;
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const fields = parsed.data;
    const keys = Object.keys(fields);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    const values = keys.map((key) => fields[key]);
    values.push(id);

    const result = await db.query(
      `UPDATE public.onec_tenants SET ${setClause} WHERE id = $${keys.length + 1}
       RETURNING id, domain, org_name, org_type, status, is_active, contact_name, contact_email, contact_phone`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tenant not found' });

    await logPlatformAudit(req, 'tenant.updated', id, fields);
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('Tenant update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Deletes the tenant registration outright. If it was already provisioned,
// this also drops its schema (and every table/row in it) — irreversible,
// used for e.g. removing a declined or no-longer-wanted tenant.
async function deleteTenant(req, res) {
  const { id } = req.params;
  const client = await db.getPool().connect();
  try {
    await client.query('BEGIN');

    const tenantRes = await client.query('SELECT * FROM public.onec_tenants WHERE id = $1 FOR UPDATE', [id]);
    if (tenantRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Tenant not found' });
    }
    const tenant = tenantRes.rows[0];

    if (tenant.provisioned_at) {
      if (!SCHEMA_NAME_RE.test(tenant.schema_name)) {
        await client.query('ROLLBACK');
        return res.status(500).json({ error: 'Tenant has an invalid schema name' });
      }
      await client.query(`DROP SCHEMA IF EXISTS "${tenant.schema_name}" CASCADE`);
    }
    await client.query('DELETE FROM public.onec_tenants WHERE id = $1', [id]);

    await client.query('COMMIT');
    await logPlatformAudit(req, 'tenant.deleted', tenant.id, { domain: tenant.domain, wasProvisioned: !!tenant.provisioned_at });
    res.json({ data: { id: tenant.id, domain: tenant.domain, deleted: true } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Tenant deletion error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
}

module.exports = {
  register,
  getRegistrationStatus,
  superAdminLogin,
  superAdminMe,
  listTenants,
  approveTenant,
  declineTenant,
  updateTenant,
  deleteTenant
};
