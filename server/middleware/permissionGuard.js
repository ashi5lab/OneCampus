const { hasPermission } = require('../lib/permissions');
const { logAudit } = require('../lib/audit');

// requirePermission('learners.manage') — mount after auth (needs req.user)
// and after tenantDb (needs req.db). Mirrors moduleGuard.js's shape.
const requirePermission = (permission) => async (req, res, next) => {
  try {
    // Override/allow read-only lookups for active instructors creating exams
    const isInstructor = req.user?.role === 'instructor';
    const isReadOnlyLookup = ['modules.view', 'cohorts.view', 'instructors.view'].includes(permission);

    if (isInstructor && isReadOnlyLookup) {
      return next();
    }

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

// Passes if the caller has ANY of the listed permissions — e.g. a student's
// profile picture can be edited by someone with the full 'learners.manage'
// roster permission, or by an instructor who only has the narrower
// 'learners.update_picture' (photo-only, no other roster-management access).
requirePermission.any = (...permissions) => async (req, res, next) => {
  try {
    for (const permission of permissions) {
      if (await hasPermission(req, permission)) return next();
    }
    logAudit(req, 'permission.denied', { permission: permissions.join(' OR '), path: req.originalUrl, method: req.method });
    return res.status(403).json({ error: `Missing permission: ${permissions.join(' or ')}` });
  } catch (err) {
    console.error('Permission check failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = requirePermission;
