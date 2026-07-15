const { z } = require('zod');
const { parsePagination } = require('../../lib/pagination');

const unitSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  head_user_id: z.number().int().optional().nullable()
});

// ?page=&pageSize= are optional — omitting both returns every row exactly
// as before pagination existed (see lib/pagination.js).
async function getAll(req, res) {
  try {
    const { pagination, error } = parsePagination(req.query);
    if (error) return res.status(400).json({ error: 'Invalid pagination parameters', details: error });

    if (!pagination) {
      const result = await req.db.query('SELECT * FROM onec_units ORDER BY id DESC');
      return res.json({ data: result.rows });
    }

    const [rows, count] = await Promise.all([
      req.db.query('SELECT * FROM onec_units ORDER BY id DESC LIMIT $1 OFFSET $2', [pagination.limit, pagination.offset]),
      req.db.query('SELECT COUNT(*)::int AS total FROM onec_units')
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
    const result = await req.db.query('SELECT * FROM onec_units WHERE id = $1', [id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function create(req, res) {
  try {
    const parsed = unitSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { name, type, head_user_id } = parsed.data;

    const result = await req.db.query(
      'INSERT INTO onec_units (name, type, head_user_id) VALUES ($1, $2, $3) RETURNING *',
      [name, type, head_user_id]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const parsed = unitSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { name, type, head_user_id } = parsed.data;

    const result = await req.db.query(
      'UPDATE onec_units SET name = $1, type = $2, head_user_id = $3 WHERE id = $4 RETURNING *',
      [name, type, head_user_id, id]
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

    const result = await req.db.query('DELETE FROM onec_units WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getAll, getById, create, update, remove };
