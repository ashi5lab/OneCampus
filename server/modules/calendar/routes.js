const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const requirePermission = require('../../middleware/permissionGuard');

router.use(auth);
router.use(requirePermission('calendar.view'));

// The unified "what's happening" view (own events/holidays, expanded for
// recurrence, plus notices/exam schedules/assignment due dates) — this is
// what the frontend's month/agenda view actually renders.
router.get('/agenda', controller.getAgenda);
// The raw, unexpanded rows — for the admin management list (edit/delete a
// recurrence rule itself, not one occurrence of it).
router.get('/events', controller.listRaw);

router.post('/events', requirePermission('calendar.manage'), controller.create);
router.put('/events/:id', requirePermission('calendar.manage'), controller.update);
router.delete('/events/:id', requirePermission('calendar.manage'), controller.remove);

module.exports = router;
