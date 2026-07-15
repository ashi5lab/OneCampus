const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// 10 attempts per 15 minutes, keyed by tenant + IP (not just IP) so one
// shared-IP office/NAT can't exhaust the limit for a different tenant's
// users, and a burst against one tenant doesn't collaterally block another.
// Must run the IP through ipKeyGenerator — it normalizes IPv6 addresses
// (which have multiple textual representations for the same address) so a
// client can't bypass the limit by varying how it writes its own address.
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.tenantConfig?.domain || 'unknown'}:${ipKeyGenerator(req.ip)}`,
  message: { error: 'Too many login attempts. Try again later.' }
});

// Super admin login isn't tenant-scoped (there's only one, global), so it's
// keyed purely by IP.
const superAdminLoginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  message: { error: 'Too many login attempts. Try again later.' }
});

// Loose limit on self-serve tenant registration — just enough to stop a
// trivial spam script, not a real anti-abuse control.
const tenantRegisterRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  message: { error: 'Too many registration attempts. Try again later.' }
});

module.exports = { loginRateLimiter, superAdminLoginRateLimiter, tenantRegisterRateLimiter };
