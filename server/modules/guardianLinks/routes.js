const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const requirePermission = require('../../middleware/permissionGuard');

router.use(auth); // Protect all routes

router.get('/', requirePermission('guardian_links.view'), controller.getAll);
router.post('/', requirePermission('guardian_links.manage'), controller.create);
router.delete('/:learnerId/:guardianId', requirePermission('guardian_links.manage'), controller.remove);

module.exports = router;
