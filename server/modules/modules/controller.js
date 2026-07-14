const { z } = require('zod');

const moduleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  unit_id: z.number().int().optional().nullable(),
  credits: z.number().int().default(0)
});

async function getAll(req, res) {
  try {
    const result = await req.db.query('SELECT * FROM onec_modules ORDER BY id DESC');
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getById(req, res) {
  try {
    const { id } = req.params;
    const result = await req.db.query('SELECT * FROM onec_modules WHERE id = $1', [id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function create(req, res) {
  try {
    const parsed = moduleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { name, code, unit_id, credits } = parsed.data;

    const result = await req.db.query(
      'INSERT INTO onec_modules (name, code, unit_id, credits) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, code, unit_id, credits]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    // Handle unique constraint violation on code
    if (err.code === '23505') return res.status(400).json({ error: 'Module code must be unique' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const parsed = moduleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { name, code, unit_id, credits } = parsed.data;

    const result = await req.db.query(
      'UPDATE onec_modules SET name = $1, code = $2, unit_id = $3, credits = $4 WHERE id = $5 RETURNING *',
      [name, code, unit_id, credits, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(400).json({ error: 'Module code must be unique' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;

    const result = await req.db.query('DELETE FROM onec_modules WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getAll, getById, create, update, remove };
