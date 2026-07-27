const { sendPush } = require('../../lib/sendPush');
const { emitToUser } = require('../../lib/socket');

// Internal helper — call this from any module (attendance, notices, discipline, etc.)
// to create a notification in one place. Handles in-app storage, Socket.io delivery,
// and fire-and-forget FCM push in a single call.
// tenantDomain: required for Socket.io scoping (e.g., from req.user.tenant or req.tenant.domain)
async function createNotification(db, tenantDomain, userId, { type, title, body, url, data }) {
  try {
    const result = await db.query(
      `INSERT INTO onec_notifications (user_id, type, title, body, url, data)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, type, title, body, url, data ? JSON.stringify(data) : null]
    );
    const notification = result.rows[0];

    // Real-time: emit to the user's private Socket.io room so they see it instantly
    if (tenantDomain) {
      emitToUser(tenantDomain, userId, 'notification:new', notification);
    }

    // Push: fire-and-forget, don't block the response
    // This handles both web and mobile (FCM routes to the right channel)
    sendPush(db, userId, { title, body, data: { url: url || '/app' } }).catch(() => {});

    console.log(`[Notifications] Created for user ${userId}: ${type} — ${title}`);
    return notification;
  } catch (error) {
    console.error('[Notifications] createNotification error:', error.message);
    throw error;
  }
}

// GET /notifications?page&pageSize
// Returns paginated list of notifications for the authenticated user
async function list(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(50, parseInt(req.query.pageSize) || 20);
    const offset = (page - 1) * pageSize;

    const [countRes, dataRes] = await Promise.all([
      req.db.query(
        'SELECT COUNT(*) FROM onec_notifications WHERE user_id = $1',
        [req.user.userId]
      ),
      req.db.query(
        `SELECT * FROM onec_notifications WHERE user_id = $1
         ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [req.user.userId, pageSize, offset]
      ),
    ]);

    const total = parseInt(countRes.rows[0].count, 10);
    res.json({
      data: dataRes.rows,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    console.error('[Notifications] list error:', error.message);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

// GET /notifications/unread-count
// Returns count of unread notifications for the authenticated user
async function unreadCount(req, res) {
  try {
    const result = await req.db.query(
      'SELECT COUNT(*) FROM onec_notifications WHERE user_id = $1 AND is_read = FALSE',
      [req.user.userId]
    );
    const count = parseInt(result.rows[0].count, 10);
    res.json({ count });
  } catch (error) {
    console.error('[Notifications] unreadCount error:', error.message);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
}

// PATCH /notifications/:id/read
// Marks a single notification as read
async function markRead(req, res) {
  try {
    await req.db.query(
      'UPDATE onec_notifications SET is_read = TRUE, read_at = NOW() WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );
    res.json({ ok: true });
  } catch (error) {
    console.error('[Notifications] markRead error:', error.message);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
}

// PATCH /notifications/read-all
// Marks all unread notifications as read for the authenticated user
async function markAllRead(req, res) {
  try {
    await req.db.query(
      'UPDATE onec_notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = $1 AND is_read = FALSE',
      [req.user.userId]
    );
    res.json({ ok: true });
  } catch (error) {
    console.error('[Notifications] markAllRead error:', error.message);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
}

module.exports = {
  createNotification,
  list,
  unreadCount,
  markRead,
  markAllRead,
};
