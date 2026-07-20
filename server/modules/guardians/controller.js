const { z } = require('zod');
const bcrypt = require('bcrypt');
const { logAudit } = require('../../lib/audit');
const { parsePagination } = require('../../lib/pagination');
const { hasPermission } = require('../../lib/permissions');
const { getScopedLearnerIds } = require('../../lib/rowScope');

const guardianCreateSchema = z.object({
  username: z.string().min(1, "Username is required"),
  email: z.string().email("A valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  phone: z.string().min(1, "Phone is required"),
  address: z.string().min(1, "Address is required"),
  whatsapp_opt_in: z.boolean().optional().default(false),
  meta: z.record(z.any()).optional().default({})
});

const guardianUpdateSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  phone: z.string().min(1, "Phone is required"),
  address: z.string().min(1, "Address is required"),
  whatsapp_opt_in: z.boolean().optional().default(false),
  meta: z.record(z.any()).optional().default({})
});

// ?page=&pageSize= are optional — omitting both returns every row exactly
// as before pagination existed (see lib/pagination.js).
async function getAll(req, res) {
  try {
    const { pagination, error } = parsePagination(req.query);
    if (error) return res.status(400).json({ error: 'Invalid pagination parameters', details: error });

    const baseQuery = 'FROM onec_guardians g LEFT JOIN onec_users u ON g.user_id = u.id';

    if (!pagination) {
      const result = await req.db.query(`SELECT g.*, u.profile_picture_url ${baseQuery} ORDER BY g.id DESC`);
      return res.json({ data: result.rows });
    }

    const [rows, count] = await Promise.all([
      req.db.query(`SELECT g.*, u.profile_picture_url ${baseQuery} ORDER BY g.id DESC LIMIT $1 OFFSET $2`, [pagination.limit, pagination.offset]),
      req.db.query(`SELECT COUNT(*)::int AS total ${baseQuery}`)
    ]);
    res.json({ data: rows.rows, meta: { total: count.rows[0].total, page: pagination.page, pageSize: pagination.pageSize } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getById(req, res) {
  try {
    const { id } = req.params;
    const result = await req.db.query('SELECT * FROM onec_guardians WHERE id = $1', [id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Creates the onec_users row and the onec_guardians row together, in one
// transaction — same pattern as learners/instructors (see those modules).
async function create(req, res) {
  try {
    const parsed = guardianCreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { username, email, password, first_name, last_name, phone, address, whatsapp_opt_in, meta } = parsed.data;
    const password_hash = await bcrypt.hash(password, 10);

    await req.db.query('BEGIN');
    try {
      const userResult = await req.db.query(
        `INSERT INTO onec_users (username, email, password_hash, role) VALUES ($1, $2, $3, 'guardian') RETURNING id`,
        [username, email, password_hash]
      );
      const user_id = userResult.rows[0].id;

      const guardianResult = await req.db.query(
        `INSERT INTO onec_guardians (user_id, first_name, last_name, phone, address, whatsapp_opt_in, meta)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [user_id, first_name, last_name, phone, address, whatsapp_opt_in, meta]
      );

      await req.db.query('COMMIT');
      res.status(201).json({ data: guardianResult.rows[0] });
    } catch (err) {
      await req.db.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(400).json({ error: 'Username or email is already in use' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const parsed = guardianUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { first_name, last_name, phone, address, whatsapp_opt_in, meta } = parsed.data;

    const result = await req.db.query(
      'UPDATE onec_guardians SET first_name = $1, last_name = $2, phone = $3, address = $4, whatsapp_opt_in = $5, meta = $6 WHERE id = $7 RETURNING *',
      [first_name, last_name, phone, address, whatsapp_opt_in, meta, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;

    const result = await req.db.query('DELETE FROM onec_guardians WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    logAudit(req, 'guardian.deleted', { guardian_id: result.rows[0].id });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// A guardian-side counterpart to learners/controller.js's getProfile: the
// linked-learners list plus the guardian's own details, for the guardian
// profile page. Not gated by requirePermission('guardians.view') at the
// route level (see routes.js) — a guardian should be able to view their own
// profile, and a learner should be able to view their own guardian's
// profile (the link on their own profile page), even without roster access.
// Roster-level roles (admin/instructor) can view anyone's via guardians.view.
async function getProfile(req, res) {
  try {
    const guardianId = Number(req.params.id);

    const hasRosterAccess = await hasPermission(req, 'guardians.view');
    if (!hasRosterAccess) {
      let allowed = false;
      if (req.user.role === 'guardian') {
        const ownGuardian = await req.db.query('SELECT id FROM onec_guardians WHERE user_id = $1', [req.user.userId]);
        allowed = ownGuardian.rows[0]?.id === guardianId;
      } else {
        const scopedLearnerIds = await getScopedLearnerIds(req);
        if (scopedLearnerIds && scopedLearnerIds.length > 0) {
          const linkResult = await req.db.query(
            'SELECT 1 FROM onec_learner_guardian_map WHERE guardian_id = $1 AND learner_id = ANY($2::int[])',
            [guardianId, scopedLearnerIds]
          );
          allowed = linkResult.rows.length > 0;
        }
      }
      if (!allowed) return res.status(403).json({ error: 'Missing permission: guardians.view' });
    }

    const guardianResult = await req.db.query(
      `SELECT g.*, usr.email, usr.profile_picture_url
       FROM onec_guardians g
       LEFT JOIN onec_users usr ON g.user_id = usr.id
       WHERE g.id = $1`,
      [guardianId]
    );
    if (guardianResult.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const learnersResult = await req.db.query(
      `SELECT l.id, l.first_name, l.last_name, l.registry_no, l.status, c.name AS cohort_name, usr.profile_picture_url
       FROM onec_learner_guardian_map map
       JOIN onec_learners l ON map.learner_id = l.id
       LEFT JOIN onec_cohorts c ON l.cohort_id = c.id
       LEFT JOIN onec_users usr ON l.user_id = usr.id
       WHERE map.guardian_id = $1
       ORDER BY l.first_name, l.last_name`,
      [guardianId]
    );

    res.json({ data: { guardian: guardianResult.rows[0], learners: learnersResult.rows } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getAll, getById, getProfile, create, update, remove };
