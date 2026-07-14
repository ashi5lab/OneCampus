const { z } = require('zod');

const guardianSchema = z.object({
  user_id: z.number().int(),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  phone: z.string().min(1, "Phone is required"),
  address: z.string().min(1, "Address is required"),
  meta: z.record(z.any()).optional().default({})
});

async function getAll(req, res) {
  try {
    const result = await req.db.query('SELECT * FROM onec_guardians ORDER BY id DESC');
    res.json({ data: result.rows });
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

async function create(req, res) {
  try {
    const parsed = guardianSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { user_id, first_name, last_name, phone, address, meta } = parsed.data;

    const result = await req.db.query(
      'INSERT INTO onec_guardians (user_id, first_name, last_name, phone, address, meta) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [user_id, first_name, last_name, phone, address, meta]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(400).json({ error: 'User ID must be unique' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const parsed = guardianSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { user_id, first_name, last_name, phone, address, meta } = parsed.data;

    const result = await req.db.query(
      'UPDATE onec_guardians SET user_id = $1, first_name = $2, last_name = $3, phone = $4, address = $5, meta = $6 WHERE id = $7 RETURNING *',
      [user_id, first_name, last_name, phone, address, meta, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(400).json({ error: 'User ID must be unique' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;

    const result = await req.db.query('DELETE FROM onec_guardians WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getAll, getById, create, update, remove };
