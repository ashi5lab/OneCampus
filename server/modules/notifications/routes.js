const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const controller = require('./controller');

// All notification endpoints require authentication
router.use(auth);

// GET /api/v1/notifications?page=1&pageSize=20
// Returns paginated notifications for the authenticated user
router.get('/', controller.list);

// GET /api/v1/notifications/unread-count
// Returns count of unread notifications
router.get('/unread-count', controller.unreadCount);

// PATCH /api/v1/notifications/:id/read
// Mark a specific notification as read
router.patch('/:id/read', controller.markRead);

// PATCH /api/v1/notifications/read-all
// Mark all notifications as read
router.patch('/read-all', controller.markAllRead);

module.exports = router;
