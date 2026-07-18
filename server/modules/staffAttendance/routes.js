const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const requirePermission = require('../../middleware/permissionGuard');

router.use(auth);

router.get('/mine', requirePermission('staff_attendance.view_own'), controller.listMine);
router.get('/', requirePermission('staff_attendance.view'), controller.getAll);
router.post('/', requirePermission('staff_attendance.mark'), controller.mark);

module.exports = router;
