const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const { loginRateLimiter } = require('../../middleware/rateLimiters');

// Login endpoint
// Note: This relies on the tenantResolver middleware running before it
router.post('/login', loginRateLimiter, controller.login);
router.get('/me', auth, controller.me);

module.exports = router;
