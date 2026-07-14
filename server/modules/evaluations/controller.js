const { z } = require('zod');

const evaluationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  time_block: z.string().min(1, "Time block is required"),
  type: z.enum(['exam', 'activity_log', 'project'])
});

const scheduleSchema = z.object({
  module_id: z.number().int(),
  eval_date: z.string(), // YYYY-MM-DD
  max_score: z.number().default(100),
  passing_score: z.number().default(40)
});

const scoreSchema = z.object({
  learner_id: z.number().int(),
  score_obtained: z.number(),
  remarks: z.string().optional().nullable()
});

// --- Evaluations ---

async function listEvaluations(req, res) {
  try {
    const result = await req.db.query('SELECT * FROM onec_evaluations ORDER BY id DESC');
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getEvaluation(req, res) {
  try {
    const { id } = req.params;
    const result = await req.db.query('SELECT * FROM onec_evaluations WHERE id = $1', [id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function createEvaluation(req, res) {
  try {
    const parsed = evaluationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { name, time_block, type } = parsed.data;

    const result = await req.db.query(
      'INSERT INTO onec_evaluations (name, time_block, type) VALUES ($1, $2, $3) RETURNING *',
      [name, time_block, type]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateEvaluation(req, res) {
  try {
    const { id } = req.params;
    const parsed = evaluationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { name, time_block, type } = parsed.data;

    const result = await req.db.query(
      'UPDATE onec_evaluations SET name = $1, time_block = $2, type = $3 WHERE id = $4 RETURNING *',
      [name, time_block, type, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function removeEvaluation(req, res) {
  try {
    const { id } = req.params;

    const result = await req.db.query('DELETE FROM onec_evaluations WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// --- Evaluation Schedules ---
// A schedule pins an evaluation to a specific module/subject, date, and score range.

async function listSchedules(req, res) {
  try {
    const { evaluationId } = req.params;
    const result = await req.db.query(
      'SELECT * FROM onec_evaluation_schedules WHERE evaluation_id = $1 ORDER BY eval_date ASC, id ASC',
      [evaluationId]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function createSchedule(req, res) {
  try {
    const { evaluationId } = req.params;
    const parsed = scheduleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { module_id, eval_date, max_score, passing_score } = parsed.data;

    const result = await req.db.query(
      `INSERT INTO onec_evaluation_schedules (evaluation_id, module_id, eval_date, max_score, passing_score)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [evaluationId, module_id, eval_date, max_score, passing_score]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23503') return res.status(400).json({ error: 'Evaluation or module does not exist' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateSchedule(req, res) {
  try {
    const { scheduleId } = req.params;
    const parsed = scheduleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { module_id, eval_date, max_score, passing_score } = parsed.data;

    const result = await req.db.query(
      `UPDATE onec_evaluation_schedules SET module_id = $1, eval_date = $2, max_score = $3, passing_score = $4
       WHERE id = $5 RETURNING *`,
      [module_id, eval_date, max_score, passing_score, scheduleId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function removeSchedule(req, res) {
  try {
    const { scheduleId } = req.params;

    const result = await req.db.query('DELETE FROM onec_evaluation_schedules WHERE id = $1 RETURNING *', [scheduleId]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// --- Learner Scores ---

async function listScores(req, res) {
  try {
    const { scheduleId } = req.params;
    const result = await req.db.query(
      'SELECT * FROM onec_learner_scores WHERE eval_schedule_id = $1 ORDER BY id ASC',
      [scheduleId]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function recordScore(req, res) {
  try {
    const { scheduleId } = req.params;
    const parsed = scoreSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { learner_id, score_obtained, remarks } = parsed.data;
    const graded_by = req.user.userId;

    // Upsert by (eval_schedule_id, learner_id) — there's no DB-level unique
    // constraint on this pair, so this check-then-write has the same small
    // race window as the attendance module's mark() upsert.
    const existing = await req.db.query(
      'SELECT id FROM onec_learner_scores WHERE eval_schedule_id = $1 AND learner_id = $2',
      [scheduleId, learner_id]
    );

    let result;
    if (existing.rows.length > 0) {
      result = await req.db.query(
        'UPDATE onec_learner_scores SET score_obtained = $1, remarks = $2, graded_by = $3 WHERE id = $4 RETURNING *',
        [score_obtained, remarks, graded_by, existing.rows[0].id]
      );
    } else {
      result = await req.db.query(
        `INSERT INTO onec_learner_scores (eval_schedule_id, learner_id, score_obtained, remarks, graded_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [scheduleId, learner_id, score_obtained, remarks, graded_by]
      );
    }

    res.status(200).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23503') return res.status(400).json({ error: 'Schedule or learner does not exist' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  listEvaluations, getEvaluation, createEvaluation, updateEvaluation, removeEvaluation,
  listSchedules, createSchedule, updateSchedule, removeSchedule,
  listScores, recordScore
};
