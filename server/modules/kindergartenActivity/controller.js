const { z } = require('zod');

const logSchema = z.object({
  learner_id: z.number().int(),
  date: z.string().min(1, "Date is required"),
  meal_intake: z.string().optional().nullable(),
  sleep_duration: z.string().optional().nullable(),
  activities: z.array(z.string()).optional().default([])
});

async function getAll(req, res) {
  try {
    const { learner_id, date } = req.query;
    const conditions = [];
    const params = [];

    if (learner_id) {
      params.push(learner_id);
      conditions.push(`learner_id = $${params.length}`);
    }
    if (date) {
      params.push(date);
      conditions.push(`date = $${params.length}`);
    }

    let query = 'SELECT * FROM onec_kindergarten_daily_activity';
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY date DESC, id DESC';

    const result = await req.db.query(query, params);
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Upsert by (learner_id, date) — no DB-level unique constraint on this pair
// (same shape of limitation as attendance.mark()'s check-then-write), but
// one daily log per learner per day is the natural expectation.
async function log(req, res) {
  try {
    const parsed = logSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { learner_id, date, meal_intake, sleep_duration, activities } = parsed.data;
    const logged_by = req.user.userId;

    const existing = await req.db.query(
      'SELECT id FROM onec_kindergarten_daily_activity WHERE learner_id = $1 AND date = $2',
      [learner_id, date]
    );

    let result;
    if (existing.rows.length > 0) {
      result = await req.db.query(
        `UPDATE onec_kindergarten_daily_activity
         SET meal_intake = $1, sleep_duration = $2, activities = $3, logged_by = $4
         WHERE id = $5 RETURNING *`,
        [meal_intake, sleep_duration, activities, logged_by, existing.rows[0].id]
      );
    } else {
      result = await req.db.query(
        `INSERT INTO onec_kindergarten_daily_activity (learner_id, date, meal_intake, sleep_duration, activities, logged_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [learner_id, date, meal_intake, sleep_duration, activities, logged_by]
      );
    }

    res.status(200).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23503') return res.status(400).json({ error: 'Learner does not exist' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getAll, log };
