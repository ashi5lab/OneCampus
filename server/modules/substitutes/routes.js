const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const requirePermission = require('../../middleware/permissionGuard');

router.use(auth);

router.get('/coverage/:leaveRequestId', requirePermission('substitutes.view'), controller.getCoverage);
router.post('/', requirePermission('substitutes.manage'), controller.assign);
router.delete('/:id', requirePermission('substitutes.manage'), controller.unassign);

module.exports = router;
