const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const requirePermission = require('../../middleware/permissionGuard');

router.use(auth);

router.get('/', requirePermission('discipline.view'), controller.getAll);
router.post('/', requirePermission('discipline.log'), controller.create);
router.put('/:id', requirePermission('discipline.log'), controller.update);
router.delete('/:id', requirePermission('discipline.log'), controller.remove);

module.exports = router;
