const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const requirePermission = require('../../middleware/permissionGuard');

router.use(auth); // Protect all routes

router.get('/', requirePermission('cohorts.view'), controller.getAll);
router.post('/', requirePermission('cohorts.manage'), controller.create);
router.get('/:id', requirePermission('cohorts.view'), controller.getById);
router.put('/:id', requirePermission('cohorts.manage'), controller.update);
router.delete('/:id', requirePermission('cohorts.manage'), controller.remove);

module.exports = router;
