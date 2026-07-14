const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

function auth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    console.error('JWT verification failed:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // JWT_SECRET is shared across all tenants, so signature validity alone isn't
  // enough — without this check, a token minted for one tenant would also pass
  // auth when replayed against a different tenant's domain.
  if (!req.tenantConfig || decoded.tenant !== req.tenantConfig.domain) {
    return res.status(401).json({ error: 'Token is not valid for this tenant' });
  }

  req.user = decoded;
  next();
}

module.exports = auth;
