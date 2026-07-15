const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const moduleGuard = require('../../middleware/moduleGuard');
const requirePermission = require('../../middleware/permissionGuard');

// Protect all routes with auth AND ensure the certificates module is active
router.use(auth);
router.use(moduleGuard('certificates'));

router.get('/', requirePermission('certificates.view'), controller.getAll);
router.get('/:id', requirePermission('certificates.view'), controller.getById);
router.get('/:id/pdf', requirePermission('certificates.view'), controller.getPdf);
router.post('/', requirePermission('certificates.issue'), controller.issue);

module.exports = router;
