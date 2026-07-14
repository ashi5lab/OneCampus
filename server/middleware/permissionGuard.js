const { hasPermission } = require('../lib/permissions');
const { logAudit } = require('../lib/audit');

// requirePermission('learners.manage') — mount after auth (needs req.user)
// and after tenantDb (needs req.db). Mirrors moduleGuard.js's shape.
module.exports = (permission) => async (req, res, next) => {
  try {
    if (!(await hasPermission(req, permission))) {
      logAudit(req, 'permission.denied', { permission, path: req.originalUrl, method: req.method });
      return res.status(403).json({ error: `Missing permission: ${permission}` });
    }
    next();
  } catch (err) {
    console.error('Permission check failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
