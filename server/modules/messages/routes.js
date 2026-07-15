const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const moduleGuard = require('../../middleware/moduleGuard');
const requirePermission = require('../../middleware/permissionGuard');

router.use(auth);
router.use(moduleGuard('messaging'));

router.get('/inbox', requirePermission('messages.view'), controller.listInbox);
router.get('/sent', requirePermission('messages.view'), controller.listSent);
router.get('/unread-count', requirePermission('messages.view'), controller.getUnreadCount);
router.get('/recipients', requirePermission('messages.view'), controller.listRecipients);
router.post('/', requirePermission('messages.send'), controller.send);
router.patch('/:id/read', requirePermission('messages.view'), controller.markRead);

module.exports = router;
