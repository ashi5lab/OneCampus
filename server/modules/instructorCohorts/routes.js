const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const requirePermission = require('../../middleware/permissionGuard');

router.use(auth); // Protect all routes

router.get('/', requirePermission('instructor_cohorts.view'), controller.getAll);
router.post('/', requirePermission('instructor_cohorts.manage'), controller.create);
router.delete('/:instructorId/:cohortId', requirePermission('instructor_cohorts.manage'), controller.remove);

module.exports = router;
