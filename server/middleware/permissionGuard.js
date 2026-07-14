const { hasPermission } = require('../lib/permissions');

// requirePermission('learners.manage') — mount after auth (needs req.user)
// and after tenantDb (needs req.db). Mirrors moduleGuard.js's shape.
module.exports = (permission) => async (req, res, next) => {
  try {
    if (!(await hasPermission(req, permission))) {
      return res.status(403).json({ error: `Missing permission: ${permission}` });
    }
    next();
  } catch (err) {
    console.error('Permission check failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
