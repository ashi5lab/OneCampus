const { z } = require('zod');
const { getOwnLearnerId } = require('../../lib/ownLearner');

const attendanceSchema = z.object({
  learner_id: z.number().int(),
  cohort_id: z.number().int(),
  allocation_id: z.number().int().optional().nullable(),
  date: z.string(), // YYYY-MM-DD
  status: z.enum(['present', 'absent', 'late', 'excused']),
  remarks: z.string().optional().nullable()
});

async function getAll(req, res) {
  try {
    // Filter by cohort_id and/or date, independently — either may be omitted.
    const { cohort_id, date } = req.query;
    const conditions = [];
    const params = [];

    // Row-level self-scoping for the learner role (see lib/ownLearner.js) —
    // forces the filter regardless of any query params, so a learner can't
    // widen the result set by simply omitting cohort_id/date.
    const ownLearnerId = await getOwnLearnerId(req);
    if (ownLearnerId !== null) {
      params.push(ownLearnerId);
      conditions.push(`learner_id = $${params.length}`);
    }

    if (cohort_id) {
      params.push(cohort_id);
      conditions.push(`cohort_id = $${params.length}`);
    }
    if (date) {
      params.push(date);
      conditions.push(`date = $${params.length}`);
    }

    let query = 'SELECT * FROM onec_attendance';
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY date DESC, id DESC';

    const result = await req.db.query(query, params);
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function mark(req, res) {
  try {
    const parsed = attendanceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { learner_id, cohort_id, allocation_id, date, status, remarks } = parsed.data;
    const marked_by = req.user.userId;

    // We use an UPSERT pattern based on the UNIQUE(learner_id, date, allocation_id) constraint
    // In PostgreSQL, to use ON CONFLICT with a nullable column like allocation_id,
    // it's tricky because NULL != NULL in unique indexes.
    // For now, assuming either daily (allocation_id is null) or hourly, we will just handle the basic conflict clause.

    // If allocation_id is null, our schema has a UNIQUE(learner_id, date, allocation_id) constraint.
    // We will do a manual check if UPSERT syntax becomes complex with NULL constraints.
    const checkQuery = `
      SELECT id FROM onec_attendance
      WHERE learner_id = $1 AND date = $2
      ${allocation_id ? 'AND allocation_id = $3' : 'AND allocation_id IS NULL'}
    `;
    const checkParams = allocation_id ? [learner_id, date, allocation_id] : [learner_id, date];
    const existing = await req.db.query(checkQuery, checkParams);

    let result;
    if (existing.rows.length > 0) {
      // Update
      const id = existing.rows[0].id;
      result = await req.db.query(
        'UPDATE onec_attendance SET status = $1, remarks = $2, marked_by = $3 WHERE id = $4 RETURNING *',
        [status, remarks, marked_by, id]
      );
    } else {
      // Insert
      result = await req.db.query(`
        INSERT INTO onec_attendance (learner_id, cohort_id, allocation_id, date, status, remarks, marked_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [learner_id, cohort_id, allocation_id, date, status, remarks, marked_by]);
    }

    res.status(200).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23503') return res.status(400).json({ error: 'Learner, cohort, or allocation does not exist' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getAll, mark };
