const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const moduleGuard = require('../../middleware/moduleGuard');

// Protect all routes with auth AND ensure the attendance module is active
router.use(auth);
router.use(moduleGuard('attendance'));

router.get('/', controller.getAll);
router.post('/', controller.mark);

module.exports = router;
