const { z } = require('zod');
const { logAudit } = require('../../lib/audit');
const { getOwnGuardianLearnerIds } = require('../../lib/ownGuardianLearners');

const linkSchema = z.object({
  learner_id: z.number().int(),
  guardian_id: z.number().int()
});

// GET /api/v1/guardian-links?learner_id=&guardian_id=
// A guardian caller is force-scoped to their own guardian_id regardless of
// the query param, same self-scoping pattern as lib/rowScope.js elsewhere —
// guardian_links.view alone shouldn't let a guardian browse other
// guardians' links.
async function getAll(req, res) {
  try {
    const ownGuardianLearnerIds = await getOwnGuardianLearnerIds(req);

    const conditions = [];
    const params = [];

    if (ownGuardianLearnerIds !== null) {
      const guardianResult = await req.db.query('SELECT id FROM onec_guardians WHERE user_id = $1', [req.user.userId]);
      const ownGuardianId = guardianResult.rows[0]?.id ?? -1;
      params.push(ownGuardianId);
      conditions.push(`guardian_id = $${params.length}`);
    } else {
      if (req.query.learner_id) {
        params.push(req.query.learner_id);
        conditions.push(`learner_id = $${params.length}`);
      }
      if (req.query.guardian_id) {
        params.push(req.query.guardian_id);
        conditions.push(`guardian_id = $${params.length}`);
      }
    }

    let query = 'SELECT * FROM onec_learner_guardian_map';
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY learner_id ASC, guardian_id ASC';

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

    const { learner_id, guardian_id } = parsed.data;

    const result = await req.db.query(
      `INSERT INTO onec_learner_guardian_map (learner_id, guardian_id)
       VALUES ($1, $2) ON CONFLICT (learner_id, guardian_id) DO NOTHING RETURNING *`,
      [learner_id, guardian_id]
    );

    if (result.rows.length === 0) {
      // Link already existed — return the existing row rather than a
      // confusing empty success body.
      const existing = await req.db.query(
        'SELECT * FROM onec_learner_guardian_map WHERE learner_id = $1 AND guardian_id = $2',
        [learner_id, guardian_id]
      );
      return res.status(200).json({ data: existing.rows[0] });
    }

    logAudit(req, 'guardian_link.created', { learner_id, guardian_id });
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23503') return res.status(400).json({ error: 'Learner or guardian does not exist' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function remove(req, res) {
  try {
    const learnerId = Number(req.params.learnerId);
    const guardianId = Number(req.params.guardianId);

    const result = await req.db.query(
      'DELETE FROM onec_learner_guardian_map WHERE learner_id = $1 AND guardian_id = $2 RETURNING *',
      [learnerId, guardianId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    logAudit(req, 'guardian_link.removed', { learner_id: learnerId, guardian_id: guardianId });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getAll, create, remove };
