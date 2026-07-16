const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const requirePermission = require('../../middleware/permissionGuard');

router.use(auth);

router.get('/', requirePermission('staff.view'), controller.getAll);
router.post('/', requirePermission('staff.manage'), controller.create);
router.put('/:id', requirePermission('staff.manage'), controller.update);
router.delete('/:id', requirePermission('staff.manage'), controller.remove);
router.patch('/:id/designation', requirePermission('staff.manage'), controller.setDesignation);

module.exports = router;
