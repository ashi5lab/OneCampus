const { z } = require('zod');
const { logAudit } = require('../../lib/audit');

const linkSchema = z.object({
  instructor_id: z.number().int(),
  module_id: z.number().int()
});

// GET /api/v1/instructor-modules?instructor_id=&module_id=
async function getAll(req, res) {
  try {
    const conditions = [];
    const params = [];

    if (req.query.instructor_id) {
      params.push(req.query.instructor_id);
      conditions.push(`instructor_id = $${params.length}`);
    }
    if (req.query.module_id) {
      params.push(req.query.module_id);
      conditions.push(`module_id = $${params.length}`);
    }

    let query = 'SELECT * FROM onec_instructor_modules';
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY instructor_id ASC, module_id ASC';

    const result = await req.db.query(query, params);
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function create(req, res) {
  try {
    const parsed = linkSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { instructor_id, module_id } = parsed.data;

    const result = await req.db.query(
      `INSERT INTO onec_instructor_modules (instructor_id, module_id)
       VALUES ($1, $2) ON CONFLICT (instructor_id, module_id) DO NOTHING RETURNING *`,
      [instructor_id, module_id]
    );

    if (result.rows.length === 0) {
      // Link already existed — return the existing row rather than a
      // confusing empty success body.
      const existing = await req.db.query(
        'SELECT * FROM onec_instructor_modules WHERE instructor_id = $1 AND module_id = $2',
        [instructor_id, module_id]
      );
      return res.status(200).json({ data: existing.rows[0] });
    }

    logAudit(req, 'instructor_module.created', { instructor_id, module_id });
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23503') return res.status(400).json({ error: 'Instructor or subject does not exist' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function remove(req, res) {
  try {
    const instructorId = Number(req.params.instructorId);
    const moduleId = Number(req.params.moduleId);

    const result = await req.db.query(
      'DELETE FROM onec_instructor_modules WHERE instructor_id = $1 AND module_id = $2 RETURNING *',
      [instructorId, moduleId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    logAudit(req, 'instructor_module.removed', { instructor_id: instructorId, module_id: moduleId });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getAll, create, remove };
