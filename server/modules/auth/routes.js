const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const requireCsrfMatch = require('../../middleware/csrf');
const { loginRateLimiter } = require('../../middleware/rateLimiters');

// Login endpoint
// Note: This relies on the tenantResolver middleware running before it
router.post('/login', loginRateLimiter, controller.login);

// Refresh/logout act on the httpOnly refresh-token cookie, not a Bearer
// token — no `auth` middleware here (the whole point is to work when the
// access token has expired). CSRF-protected since they trust an ambient
// cookie the browser sends automatically.
router.post('/refresh', requireCsrfMatch, controller.refresh);
router.post('/logout', requireCsrfMatch, controller.logout);

router.get('/me', auth, controller.me);

module.exports = router;
