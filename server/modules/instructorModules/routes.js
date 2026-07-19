const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const requirePermission = require('../../middleware/permissionGuard');

router.use(auth); // Protect all routes

router.get('/', requirePermission('instructor_modules.view'), controller.getAll);
router.post('/', requirePermission('instructor_modules.manage'), controller.create);
router.delete('/:instructorId/:moduleId', requirePermission('instructor_modules.manage'), controller.remove);

module.exports = router;
