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

module.exports = router;
