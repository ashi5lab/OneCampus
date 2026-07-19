const { z } = require('zod');
const { parsePagination } = require('../../lib/pagination');

const cohortSchema = z.object({
  name: z.string().min(1, "Name is required"),
  unit_id: z.number().int(),
  time_block: z.string().min(1, "Time block is required"),
  advisor_id: z.number().int().optional().nullable()
});

// ?page=&pageSize= are optional — omitting both returns every row exactly
// as before pagination existed (see lib/pagination.js).
async function getAll(req, res) {
  try {
    const { pagination, error } = parsePagination(req.query);
    if (error) return res.status(400).json({ error: 'Invalid pagination parameters', details: error });

    // advisor_id references onec_users generically, but in practice is
    // always set from the instructor roster (see CohortFormModal's "Class
    // Teacher" picker) — LEFT JOIN onec_instructors by user_id to surface a
    // display name instead of a bare id.
    const advisorJoin = `LEFT JOIN onec_instructors adv ON adv.user_id = c.advisor_id`;
    const advisorSelect = `adv.first_name AS advisor_first_name, adv.last_name AS advisor_last_name`;
    // Correlated subquery rather than a LEFT JOIN + GROUP BY — cohorts are a
    // small table (one row per class/section), so this stays cheap while
    // avoiding the aggregation dance for a single count column.
    const learnerCountSelect = `(SELECT COUNT(*)::int FROM onec_learners l WHERE l.cohort_id = c.id) AS learner_count`;

    if (!pagination) {
      const result = await req.db.query(
        `SELECT c.*, ${advisorSelect}, ${learnerCountSelect} FROM onec_cohorts c ${advisorJoin} ORDER BY c.id DESC`
      );
      return res.json({ data: result.rows });
    }

    const [rows, count] = await Promise.all([
      req.db.query(
        `SELECT c.*, ${advisorSelect}, ${learnerCountSelect} FROM onec_cohorts c ${advisorJoin} ORDER BY c.id DESC LIMIT $1 OFFSET $2`,
        [pagination.limit, pagination.offset]
      ),
      req.db.query('SELECT COUNT(*)::int AS total FROM onec_cohorts')
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
    const result = await req.db.query(
      `SELECT c.*, adv.first_name AS advisor_first_name, adv.last_name AS advisor_last_name
       FROM onec_cohorts c
       LEFT JOIN onec_instructors adv ON adv.user_id = c.advisor_id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function create(req, res) {
  try {
    const parsed = cohortSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { name, unit_id, time_block, advisor_id } = parsed.data;

    const result = await req.db.query(
      'INSERT INTO onec_cohorts (name, unit_id, time_block, advisor_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, unit_id, time_block, advisor_id]
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
    const parsed = cohortSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { name, unit_id, time_block, advisor_id } = parsed.data;

    const result = await req.db.query(
      'UPDATE onec_cohorts SET name = $1, unit_id = $2, time_block = $3, advisor_id = $4 WHERE id = $5 RETURNING *',
      [name, unit_id, time_block, advisor_id, id]
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

    const result = await req.db.query('DELETE FROM onec_cohorts WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getAll, getById, create, update, remove };
