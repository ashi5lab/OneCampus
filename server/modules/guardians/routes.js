const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const requirePermission = require('../../middleware/permissionGuard');

router.use(auth); // Protect all routes

router.get('/', requirePermission('guardians.view'), controller.getAll);
router.post('/', requirePermission('guardians.manage'), controller.create);
router.get('/:id', requirePermission('guardians.view'), controller.getById);
router.put('/:id', requirePermission('guardians.manage'), controller.update);
router.delete('/:id', requirePermission('guardians.manage'), controller.remove);

// No requirePermission('guardians.view') here on purpose — getProfile does
// its own self-scoping (a guardian viewing their own profile, or a learner
// viewing their own guardian's profile, both without roster access).
router.get('/:id/profile', controller.getProfile);

module.exports = router;
