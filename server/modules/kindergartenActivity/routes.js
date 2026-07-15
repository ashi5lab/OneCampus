const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const moduleGuard = require('../../middleware/moduleGuard');
const requirePermission = require('../../middleware/permissionGuard');

// Protect all routes with auth AND ensure the kindergarten_activity module is active
router.use(auth);
router.use(moduleGuard('kindergarten_activity'));

router.get('/', requirePermission('kindergarten_activity.view'), controller.getAll);
router.post('/', requirePermission('kindergarten_activity.log'), controller.log);

module.exports = router;
