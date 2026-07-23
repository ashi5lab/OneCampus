const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const moduleGuard = require('../../middleware/moduleGuard');
const requirePermission = require('../../middleware/permissionGuard');

// Protect all routes with auth AND ensure the attendance module is active
router.use(auth);
router.use(moduleGuard('attendance'));

router.get('/', requirePermission('attendance.view'), controller.getAll);
router.get('/absentee-report', requirePermission('attendance.view'), controller.absenteeReport);
router.post('/', requirePermission('attendance.mark'), controller.mark);

module.exports = router;
