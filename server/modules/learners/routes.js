const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const requirePermission = require('../../middleware/permissionGuard');

router.use(auth); // Protect all routes

router.get('/', requirePermission('learners.view'), controller.getAll);
router.post('/', requirePermission('learners.manage'), controller.create);
router.get('/:id', requirePermission('learners.view'), controller.getById);
router.put('/:id', requirePermission('learners.manage'), controller.update);
router.delete('/:id', requirePermission('learners.manage'), controller.remove);

// No requirePermission('learners.view') here on purpose — getProfile does
// its own access check (roster access OR own/linked-child self-view), see
// controller.js for why.
router.get('/:id/profile', controller.getProfile);
router.patch('/:id/class-head', requirePermission('learners.manage'), controller.setClassHead);
// setSchoolHead does its own narrower principal-only check inside — see
// controller.js. learners.manage is still required at the route level as
// the coarse gate (a random unrelated role shouldn't even reach the
// designation check).
router.patch('/:id/school-head', requirePermission('learners.manage'), controller.setSchoolHead);

module.exports = router;
