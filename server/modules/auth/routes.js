const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { loginRateLimiter } = require('../../middleware/rateLimiters');

// Login endpoint
// Note: This relies on the tenantResolver middleware running before it
router.post('/login', loginRateLimiter, controller.login);

module.exports = router;
