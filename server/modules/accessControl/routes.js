const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const requirePermission = require('../../middleware/permissionGuard');

router.use(auth);
router.use(requirePermission('access_control.manage'));

router.get('/groups', controller.listGroups);
router.post('/groups', controller.createGroup);
router.put('/groups/:id', controller.updateGroup);
router.delete('/groups/:id', controller.deleteGroup);

router.get('/users', controller.listUsers);
router.get('/permissions', controller.listPermissions);

module.exports = router;
