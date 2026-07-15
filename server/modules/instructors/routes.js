const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const requirePermission = require('../../middleware/permissionGuard');

router.use(auth); // Protect all routes

router.get('/', requirePermission('instructors.view'), controller.getAll);
router.post('/', requirePermission('instructors.manage'), controller.create);
router.get('/:id', requirePermission('instructors.view'), controller.getById);
router.put('/:id', requirePermission('instructors.manage'), controller.update);
router.delete('/:id', requirePermission('instructors.manage'), controller.remove);
router.get('/:id/profile', requirePermission('instructors.view'), controller.getProfile);

module.exports = router;
