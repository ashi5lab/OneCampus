const { z } = require('zod');
const { listActiveUsers } = require('../../lib/userDirectory');

const sendSchema = z.object({
  recipient_id: z.number().int(),
  subject: z.string().max(255).optional().nullable(),
  body: z.string().min(1, 'Message body is required')
});

async function listInbox(req, res) {
  try {
    const result = await req.db.query(
      `SELECT m.*, u.username AS sender_username, u.role AS sender_role
       FROM onec_messages m
       JOIN onec_users u ON m.sender_id = u.id
       WHERE m.recipient_id = $1
       ORDER BY m.created_at DESC`,
      [req.user.userId]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function listSent(req, res) {
  try {
    const result = await req.db.query(
      `SELECT m.*, u.username AS recipient_username, u.role AS recipient_role
       FROM onec_messages m
       JOIN onec_users u ON m.recipient_id = u.id
       WHERE m.sender_id = $1
       ORDER BY m.created_at DESC`,
      [req.user.userId]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getUnreadCount(req, res) {
  try {
    const result = await req.db.query(
      'SELECT COUNT(*)::int AS count FROM onec_messages WHERE recipient_id = $1 AND is_read = false',
      [req.user.userId]
    );
    res.json({ data: { count: result.rows[0].count } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Recipient picker for the compose UI — every active user in the tenant
// except the caller. No role filtering in v1 (a learner can message an
// admin, an admin can message any learner, etc.) — narrowing who-can-
// message-whom is a reasonable follow-up if this turns out to be too open.
async function listRecipients(req, res) {
  try {
    const users = await listActiveUsers(req, { excludeUserId: req.user.userId });
    res.json({ data: users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function send(req, res) {
  try {
    const parsed = sendSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { recipient_id, subject, body } = parsed.data;

    const result = await req.db.query(
      'INSERT INTO onec_messages (sender_id, recipient_id, subject, body) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.userId, recipient_id, subject ?? null, body]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23503') return res.status(400).json({ error: 'Recipient does not exist' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Scoped to recipient_id = caller in the WHERE clause, not just the route —
// there's no separate permission check needed since a message can only ever
// be marked read by the person it was sent to.
async function markRead(req, res) {
  try {
    const { id } = req.params;
    const result = await req.db.query(
      'UPDATE onec_messages SET is_read = true WHERE id = $1 AND recipient_id = $2 RETURNING *',
      [id, req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { listInbox, listSent, getUnreadCount, listRecipients, send, markRead };
