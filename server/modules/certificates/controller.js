const { z } = require('zod');
const { logAudit } = require('../../lib/audit');
const { getOwnLearnerId } = require('../../lib/ownLearner');

const issueSchema = z.object({
  learner_id: z.number().int(),
  type: z.enum(['transfer_certificate', 'conduct', 'degree']),
  certificate_no: z.string().min(1, "Certificate number is required"),
  issue_date: z.string().min(1, "Issue date is required"),
  data: z.record(z.any()).optional().default({})
});

// Certificates are immutable official records once issued — intentionally
// no update/delete endpoints. If a certificate was issued in error, the
// correct fix is issuing a new one, not silently editing history.

async function getAll(req, res) {
  try {
    // Row-level self-scoping for the learner role (see lib/ownLearner.js) —
    // forces the filter regardless of the ?learner_id= query param, so a
    // learner can't request someone else's certificates by id.
    const ownLearnerId = await getOwnLearnerId(req);
    const learnerId = ownLearnerId !== null ? ownLearnerId : req.query.learner_id;

    let query = 'SELECT * FROM onec_certificates';
    const params = [];
    if (learnerId) {
      params.push(learnerId);
      query += ` WHERE learner_id = $${params.length}`;
    }
    query += ' ORDER BY issue_date DESC, id DESC';

    const result = await req.db.query(query, params);
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getById(req, res) {
  try {
    const { id } = req.params;
    const result = await req.db.query('SELECT * FROM onec_certificates WHERE id = $1', [id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    // A learner fetching a certificate by id that isn't theirs gets the
    // same 404 as a nonexistent one — a plain 403 would confirm the id
    // belongs to *someone*, leaking more than necessary.
    const ownLearnerId = await getOwnLearnerId(req);
    if (ownLearnerId !== null && result.rows[0].learner_id !== ownLearnerId) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function issue(req, res) {
  try {
    const parsed = issueSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { learner_id, type, certificate_no, issue_date, data } = parsed.data;
    const issued_by = req.user.userId;

    const result = await req.db.query(
      `INSERT INTO onec_certificates (learner_id, type, certificate_no, issue_date, issued_by, data)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [learner_id, type, certificate_no, issue_date, issued_by, data]
    );

    logAudit(req, 'certificate.issued', {
      certificate_id: result.rows[0].id, learner_id, type, certificate_no
    });

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(400).json({ error: 'Certificate number must be unique' });
    if (err.code === '23503') return res.status(400).json({ error: 'Learner does not exist' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getAll, getById, issue };
