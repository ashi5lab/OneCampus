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

module.exports = router;
