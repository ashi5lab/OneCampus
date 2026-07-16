const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const requirePermission = require('../../middleware/permissionGuard');

router.use(auth);

router.post('/', requirePermission('leave.apply'), controller.create);
router.get('/mine', requirePermission('leave.view_own'), controller.listMine);
// Row-scoped inside the controller (admin/principal/vice-principal see
// everything; a plain instructor sees only their own class's requests) —
// leave.approve just gates who can hit this endpoint at all, same pattern
// as reports.view gating a query that's further narrowed by params.
router.get('/', requirePermission('leave.approve'), controller.list);
router.patch('/:id/review', requirePermission('leave.approve'), controller.review);
router.delete('/:id', requirePermission('leave.apply'), controller.cancel);

module.exports = router;
