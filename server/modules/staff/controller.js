const { z } = require('zod');
const bcrypt = require('bcrypt');
const { logAudit } = require('../../lib/audit');
const { parsePagination } = require('../../lib/pagination');
const { assignDesignation } = require('../../lib/designation');
const { generateUniqueUsername, generatePassword, placeholderEmail } = require('../../lib/credentials');

const designationSchema = z.object({ designation: z.enum(['principal', 'vice_principal']).nullable() });

const staffCreateSchema = z.object({
  // username is optional; if not provided, it will be auto-generated.
  username: z.string().optional().nullable(),
  email: z.string().email('A valid email is required').optional().or(z.literal('')),
  staff_id: z.string().min(1, 'Staff ID is required'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().optional().nullable(),
  meta: z.record(z.any()).optional().default({})
});

const staffUpdateSchema = z.object({
  staff_id: z.string().min(1, 'Staff ID is required'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().optional().nullable(),
  meta: z.record(z.any()).optional().default({})
});

// ?page=&pageSize= optional (see lib/pagination.js). ?search/gender are
// independently optional filters — mirrors instructors.getAll.
async function getAll(req, res) {
  try {
    const { pagination, error } = parsePagination(req.query);
    if (error) return res.status(400).json({ error: 'Invalid pagination parameters', details: error });

    const { search, gender } = req.query;
    const conditions = [];
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(first_name ILIKE $${params.length} OR last_name ILIKE $${params.length} OR staff_id ILIKE $${params.length})`);
    }
    if (gender) {
      params.push(gender);
      conditions.push(`meta->>'gender' = $${params.length}`);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const baseQuery = `FROM onec_staff s LEFT JOIN onec_users u ON s.user_id = u.id ${whereClause}`;

    if (!pagination) {
      const result = await req.db.query(`SELECT s.*, u.profile_picture_url ${baseQuery} ORDER BY s.id DESC`, params);
      return res.json({ data: result.rows });
    }

    const pageParams = [...params, pagination.limit, pagination.offset];
    const [rows, count] = await Promise.all([
      req.db.query(
        `SELECT s.*, u.profile_picture_url ${baseQuery} ORDER BY s.id DESC LIMIT $${pageParams.length - 1} OFFSET $${pageParams.length}`,
        pageParams
      ),
      req.db.query(`SELECT COUNT(*)::int AS total ${baseQuery}`, params)
    ]);
    res.json({ data: rows.rows, meta: { total: count.rows[0].total, page: pagination.page, pageSize: pagination.pageSize } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Creates the onec_users row (role='staff') and the onec_staff row together
// in one transaction — mirrors instructors.create, the only prior existing
// path for creating a role-scoped user account.
async function create(req, res) {
  try {
    const parsed = staffCreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { username: providedUsername, email, staff_id, first_name, last_name, phone, meta } = parsed.data;
    const { withTenantPrefix } = require('../../lib/credentials');

    const username = providedUsername 
      ? withTenantPrefix(req.tenantConfig.prefix, providedUsername)
      : await generateUniqueUsername(req.db, req.tenantConfig.prefix, first_name, staff_id);
    const password = generatePassword();
    const password_hash = await bcrypt.hash(password, 10);
    const finalEmail = email || placeholderEmail(username, req.tenantConfig.domain);

    await req.db.query('BEGIN');
    try {
      const userResult = await req.db.query(
        `INSERT INTO onec_users (username, email, password_hash, role) VALUES ($1, $2, $3, 'staff') RETURNING id`,
        [username, finalEmail, password_hash]
      );
      const user_id = userResult.rows[0].id;

      const staffResult = await req.db.query(
        `INSERT INTO onec_staff (user_id, staff_id, first_name, last_name, phone, meta)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [user_id, staff_id, first_name, last_name, phone, meta]
      );

      await req.db.query('COMMIT');
      res.status(201).json({ data: { ...staffResult.rows[0], username, password } });
    } catch (err) {
      await req.db.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(400).json({ error: 'Username, email, or staff ID is already in use' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const parsed = staffUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { staff_id, first_name, last_name, phone, meta } = parsed.data;
    const result = await req.db.query(
      'UPDATE onec_staff SET staff_id = $1, first_name = $2, last_name = $3, phone = $4, meta = $5 WHERE id = $6 RETURNING *',
      [staff_id, first_name, last_name, phone, meta, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(400).json({ error: 'Staff ID must be unique' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    const result = await req.db.query('DELETE FROM onec_staff WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    logAudit(req, 'staff.deleted', { staff_id: result.rows[0].id, staff_code: result.rows[0].staff_id });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// See server/modules/instructors/controller.js's setDesignation — same
// single-holder-across-both-tables behavior via lib/designation.js.
async function setDesignation(req, res) {
  try {
    const { id } = req.params;
    const parsed = designationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const updated = await assignDesignation(req, 'onec_staff', id, parsed.data.designation);
    if (!updated) return res.status(404).json({ error: 'Not found' });

    logAudit(req, 'staff.designation_set', { staff_id: id, designation: parsed.data.designation });
    res.json({ data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getAll, create, update, remove, setDesignation };
