const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

// Separate from middleware/auth.js on purpose: super admin tokens carry
// `scope: 'super_admin'` and no `tenant` claim, so they're automatically
// rejected by auth.js's tenant check if ever replayed against a tenant
// route, and a tenant user's token (no `scope` claim) is rejected here.
function requireSuperAdmin(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  if (decoded.scope !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }

  req.superAdmin = decoded;
  next();
}

module.exports = requireSuperAdmin;
