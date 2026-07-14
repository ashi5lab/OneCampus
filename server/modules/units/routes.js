const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const requirePermission = require('../../middleware/permissionGuard');

router.use(auth); // Protect all routes

router.get('/', requirePermission('units.view'), controller.getAll);
router.post('/', requirePermission('units.manage'), controller.create);
router.get('/:id', requirePermission('units.view'), controller.getById);
router.put('/:id', requirePermission('units.manage'), controller.update);
router.delete('/:id', requirePermission('units.manage'), controller.remove);

module.exports = router;
