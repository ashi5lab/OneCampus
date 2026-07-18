const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const requirePermission = require('../../middleware/permissionGuard');

router.use(auth);

router.get('/', requirePermission('visitors.view'), controller.getAll);
router.post('/', requirePermission('visitors.log'), controller.checkIn);
router.put('/:id/checkout', requirePermission('visitors.log'), controller.checkOut);

module.exports = router;
