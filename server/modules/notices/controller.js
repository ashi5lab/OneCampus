const { z } = require('zod');
const { logAudit } = require('../../lib/audit');

const AUDIENCE_VALUES = ['all', 'instructors', 'learners', 'guardians'];

// Maps a caller's role to the audience group they should see, beyond 'all'.
// admin/staff aren't here — they manage notices, so they see every one
// regardless of target audience (handled as a special case in getAll).
const AUDIENCE_BY_ROLE = { instructor: 'instructors', learner: 'learners', guardian: 'guardians' };

const noticeSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  body: z.string().min(1, 'Body is required'),
  audience: z.enum(AUDIENCE_VALUES).default('all')
});

async function getAll(req, res) {
  try {
    const role = req.user.role;
    const isManager = role === 'admin' || role === 'staff';

    let query = `SELECT n.*, u.username AS posted_by_username
                 FROM onec_notices n
                 LEFT JOIN onec_users u ON n.posted_by = u.id`;
    const params = [];

    if (!isManager) {
      const audienceGroup = AUDIENCE_BY_ROLE[role];
      if (audienceGroup) {
        params.push(audienceGroup);
        query += ` WHERE n.audience = 'all' OR n.audience = $1`;
      } else {
        query += ` WHERE n.audience = 'all'`;
      }
    }
    query += ' ORDER BY n.created_at DESC';

    const result = await req.db.query(query, params);
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function create(req, res) {
  try {
    const parsed = noticeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { title, body, audience } = parsed.data;
    const result = await req.db.query(
      'INSERT INTO onec_notices (title, body, audience, posted_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, body, audience, req.user.userId]
    );

    logAudit(req, 'notice.posted', { notice_id: result.rows[0].id, title, audience });
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;

    // Access control: only admin or the creator can edit
    const existing = await req.db.query('SELECT posted_by FROM onec_notices WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'admin' && existing.rows[0].posted_by !== req.user.userId) {
      return res.status(403).json({ error: 'You do not have permission to edit this notice' });
    }

    const parsed = noticeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { title, body, audience } = parsed.data;
    const result = await req.db.query(
      'UPDATE onec_notices SET title = $1, body = $2, audience = $3 WHERE id = $4 RETURNING *',
      [title, body, audience, id]
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

    // Access control: only admin or the creator can delete
    const existing = await req.db.query('SELECT posted_by FROM onec_notices WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'admin' && existing.rows[0].posted_by !== req.user.userId) {
      return res.status(403).json({ error: 'You do not have permission to delete this notice' });
    }

    const result = await req.db.query('DELETE FROM onec_notices WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    logAudit(req, 'notice.deleted', { notice_id: result.rows[0].id, title: result.rows[0].title });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getAll, create, update, remove };
