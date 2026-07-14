const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const requirePermission = require('../../middleware/permissionGuard');

router.use(auth); // Protect all routes

router.get('/', requirePermission('modules.view'), controller.getAll);
router.post('/', requirePermission('modules.manage'), controller.create);
router.get('/:id', requirePermission('modules.view'), controller.getById);
router.put('/:id', requirePermission('modules.manage'), controller.update);
router.delete('/:id', requirePermission('modules.manage'), controller.remove);

module.exports = router;
