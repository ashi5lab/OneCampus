const { z } = require('zod');
const { logAudit } = require('../../lib/audit');
const { getScopedLearnerIds } = require('../../lib/rowScope');

const recordSchema = z.object({
  learner_id: z.number().int(),
  incident_date: z.string(), // YYYY-MM-DD
  severity: z.enum(['minor', 'major', 'positive']),
  description: z.string().min(1, 'Description is required'),
  action_taken: z.string().optional().nullable()
});

// Row-level self-scoping for learner/guardian roles (see lib/rowScope.js) —
// same pattern as kindergarten_activity.getAll: forces the filter
// regardless of the ?learner_id= query param.
async function getAll(req, res) {
  try {
    const { learner_id, severity } = req.query;
    const conditions = [];
    const params = [];

    const scopedLearnerIds = await getScopedLearnerIds(req);
    if (scopedLearnerIds !== null) {
      params.push(scopedLearnerIds);
      conditions.push(`d.learner_id = ANY($${params.length})`);
    } else if (learner_id) {
      params.push(learner_id);
      conditions.push(`d.learner_id = $${params.length}`);
    }
    if (severity) {
      params.push(severity);
      conditions.push(`d.severity = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await req.db.query(
      // incident_date cast to text — node-postgres otherwise parses DATE
      // columns into JS Date objects, which the frontend's plain string
      // comparisons/formatting don't expect (see the Invalid Date bug this
      // exact pattern caused in the calendar module).
      `SELECT d.id, d.learner_id, d.incident_date::text AS incident_date, d.severity, d.description, d.action_taken,
              d.reported_by, d.created_at, u.username AS reported_by_username,
              l.first_name AS learner_first_name, l.last_name AS learner_last_name, l.registry_no AS learner_registry_no
       FROM onec_discipline_records d
       LEFT JOIN onec_users u ON d.reported_by = u.id
       LEFT JOIN onec_learners l ON d.learner_id = l.id
       ${where}
       ORDER BY d.incident_date DESC, d.id DESC`,
      params
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function create(req, res) {
  try {
    const parsed = recordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { learner_id, incident_date, severity, description, action_taken } = parsed.data;
    const reported_by = req.user.userId;

    const result = await req.db.query(
      `INSERT INTO onec_discipline_records (learner_id, incident_date, severity, description, action_taken, reported_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [learner_id, incident_date, severity, description, action_taken ?? null, reported_by]
    );
    logAudit(req, 'discipline.record_logged', { record_id: result.rows[0].id, learner_id, severity });
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23503') return res.status(400).json({ error: 'Learner does not exist' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const parsed = recordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { learner_id, incident_date, severity, description, action_taken } = parsed.data;

    const existing = await req.db.query('SELECT reported_by FROM onec_discipline_records WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'admin' && existing.rows[0].reported_by !== req.user.userId) {
      return res.status(403).json({ error: 'You can only edit logs you created' });
    }

    const result = await req.db.query(
      `UPDATE onec_discipline_records 
       SET learner_id = $1, incident_date = $2, severity = $3, description = $4, action_taken = $5
       WHERE id = $6 RETURNING *`,
      [learner_id, incident_date, severity, description, action_taken ?? null, id]
    );
    
    logAudit(req, 'discipline.record_updated', { record_id: result.rows[0].id, learner_id, severity });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23503') return res.status(400).json({ error: 'Learner does not exist' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

// A logging mistake (wrong learner, duplicate entry) can be removed by
// anyone who could have logged it — same discipline.log permission, no
// separate .manage tier. Unlike certificates, these aren't official
// records that must stay immutable once issued.
async function remove(req, res) {
  try {
    const { id } = req.params;
    const existing = await req.db.query('SELECT reported_by FROM onec_discipline_records WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'admin' && existing.rows[0].reported_by !== req.user.userId) {
      return res.status(403).json({ error: 'You can only delete logs you created' });
    }

    const result = await req.db.query('DELETE FROM onec_discipline_records WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    logAudit(req, 'discipline.record_deleted', { record_id: result.rows[0].id, learner_id: result.rows[0].learner_id });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getAll, create, update, remove };
