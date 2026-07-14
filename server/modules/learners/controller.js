const { z } = require('zod');

const learnerSchema = z.object({
  user_id: z.number().int(),
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

async function create(req, res) {
  try {
    const parsed = learnerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { user_id, registry_no, first_name, last_name, cohort_id, status, meta } = parsed.data;

    const result = await req.db.query(
      'INSERT INTO onec_learners (user_id, registry_no, first_name, last_name, cohort_id, status, meta) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [user_id, registry_no, first_name, last_name, cohort_id, status, meta]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(400).json({ error: 'Registry No or User ID must be unique' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const parsed = learnerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { user_id, registry_no, first_name, last_name, cohort_id, status, meta } = parsed.data;

    const result = await req.db.query(
      'UPDATE onec_learners SET user_id = $1, registry_no = $2, first_name = $3, last_name = $4, cohort_id = $5, status = $6, meta = $7 WHERE id = $8 RETURNING *',
      [user_id, registry_no, first_name, last_name, cohort_id, status, meta, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(400).json({ error: 'Registry No or User ID must be unique' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;

    const result = await req.db.query('DELETE FROM onec_learners WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getAll, getById, create, update, remove };
