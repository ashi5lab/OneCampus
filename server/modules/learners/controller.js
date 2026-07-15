const { z } = require('zod');
const bcrypt = require('bcrypt');
const { logAudit } = require('../../lib/audit');

const learnerCreateSchema = z.object({
  username: z.string().min(1, "Username is required"),
  email: z.string().email("A valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  registry_no: z.string().min(1, "Registry number is required"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  cohort_id: z.number().int().optional().nullable(),
  status: z.string().default('active'),
  meta: z.record(z.any()).optional().default({})
});

const learnerUpdateSchema = z.object({
  registry_no: z.string().min(1, "Registry number is required"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  cohort_id: z.number().int().optional().nullable(),
  status: z.string().default('active'),
  meta: z.record(z.any()).optional().default({})
});

async function getAll(req, res) {
  try {
    const result = await req.db.query('SELECT * FROM onec_learners ORDER BY id DESC');
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getById(req, res) {
  try {
    const { id } = req.params;
    const result = await req.db.query('SELECT * FROM onec_learners WHERE id = $1', [id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Creates the onec_users row and the onec_learners row together, in one
// transaction, so the frontend never needs a pre-existing user id — this
// was previously the only way to create a learner.
async function create(req, res) {
  try {
    const parsed = learnerCreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { username, email, password, registry_no, first_name, last_name, cohort_id, status, meta } = parsed.data;
    const password_hash = await bcrypt.hash(password, 10);

    await req.db.query('BEGIN');
    try {
      const userResult = await req.db.query(
        `INSERT INTO onec_users (username, email, password_hash, role) VALUES ($1, $2, $3, 'learner') RETURNING id`,
        [username, email, password_hash]
      );
      const user_id = userResult.rows[0].id;

      const learnerResult = await req.db.query(
        `INSERT INTO onec_learners (user_id, registry_no, first_name, last_name, cohort_id, status, meta)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [user_id, registry_no, first_name, last_name, cohort_id, status, meta]
      );

      await req.db.query('COMMIT');
      res.status(201).json({ data: learnerResult.rows[0] });
    } catch (err) {
      await req.db.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(400).json({ error: 'Username, email, or registry number is already in use' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const parsed = learnerUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { registry_no, first_name, last_name, cohort_id, status, meta } = parsed.data;

    const result = await req.db.query(
      'UPDATE onec_learners SET registry_no = $1, first_name = $2, last_name = $3, cohort_id = $4, status = $5, meta = $6 WHERE id = $7 RETURNING *',
      [registry_no, first_name, last_name, cohort_id, status, meta, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(400).json({ error: 'Registry number must be unique' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;

    const result = await req.db.query('DELETE FROM onec_learners WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    logAudit(req, 'learner.deleted', { learner_id: result.rows[0].id, registry_no: result.rows[0].registry_no });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getAll, getById, create, update, remove };
