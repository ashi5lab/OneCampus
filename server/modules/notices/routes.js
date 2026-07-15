const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const requirePermission = require('../../middleware/permissionGuard');

router.use(auth);

router.get('/', requirePermission('notices.view'), controller.getAll);
router.post('/', requirePermission('notices.manage'), controller.create);
router.put('/:id', requirePermission('notices.manage'), controller.update);
router.delete('/:id', requirePermission('notices.manage'), controller.remove);

module.exports = router;
