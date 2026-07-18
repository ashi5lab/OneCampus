const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const requirePermission = require('../../middleware/permissionGuard');

router.use(auth);

router.get('/slots', requirePermission('ptm.view'), controller.listSlots);
// Slot create/remove are further scoped in the handler (ptm.manage, or the
// instructor's own availability) — the route only requires ptm.view here
// since an instructor with just that permission still needs to reach the
// handler for the ownership check to run; the handler is what actually gates.
router.post('/slots', requirePermission('ptm.view'), controller.createSlot);
router.delete('/slots/:id', requirePermission('ptm.view'), controller.removeSlot);

router.get('/my-learners', requirePermission('ptm.book'), controller.myLearners);
router.post('/slots/:id/book', requirePermission('ptm.book'), controller.bookSlot);
router.delete('/bookings/:id', requirePermission('ptm.view'), controller.cancelBooking);

module.exports = router;
