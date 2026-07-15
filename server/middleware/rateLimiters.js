const rateLimit = require('express-rate-limit');

// 10 attempts per 15 minutes, keyed by tenant + IP (not just IP) so one
// shared-IP office/NAT can't exhaust the limit for a different tenant's
// users, and a burst against one tenant doesn't collaterally block another.
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.tenantConfig?.domain || 'unknown'}:${req.ip}`,
  message: { error: 'Too many login attempts. Try again later.' }
});

module.exports = { loginRateLimiter };
