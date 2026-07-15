const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { JWT_SECRET, ACCESS_TOKEN_TTL } = require('../../config/env');
const { getPermissionsForRole } = require('../../lib/permissions');
const { issueRefreshToken, rotateRefreshToken, revokeRefreshToken } = require('../../lib/refreshTokens');
const { setAuthCookies, clearAuthCookies, REFRESH_COOKIE_NAME } = require('../../lib/authCookies');

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
});

function signAccessToken(user, tenantDomain) {
  return jwt.sign(
    { userId: user.id, role: user.role, tenant: tenantDomain },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

async function login(req, res) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });
    }
    const { username, password } = parsed.data;

    if (!req.db) {
      return res.status(500).json({ error: 'Tenant context missing' });
    }

    const result = await req.db.query('SELECT * FROM onec_users WHERE username = $1 AND is_active = true', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = signAccessToken(user, req.tenantConfig.domain);
    const { rawToken: refreshToken } = await issueRefreshToken(req.db, user.id);
    const csrfToken = setAuthCookies(res, refreshToken);

    res.json({
      data: {
        token,
        csrfToken,
        user: { id: user.id, username: user.username, role: user.role }
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Exchanges a valid, unexpired refresh-token cookie for a new short-lived
// access token, rotating the refresh token in the same call (old one
// revoked, new one issued) — see lib/refreshTokens.js. Requires the CSRF
// double-submit check (server/middleware/csrf.js) since this endpoint acts
// purely on an ambient cookie the browser attaches automatically.
async function refresh(req, res) {
  try {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!rawRefreshToken) {
      return res.status(401).json({ error: 'No refresh token' });
    }

    const rotated = await rotateRefreshToken(req.db, rawRefreshToken);
    if (!rotated) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Refresh token is invalid, expired, or already used' });
    }

    const userResult = await req.db.query('SELECT * FROM onec_users WHERE id = $1 AND is_active = true', [rotated.userId]);
    if (userResult.rows.length === 0) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'User no longer exists or is inactive' });
    }
    const user = userResult.rows[0];

    const token = signAccessToken(user, req.tenantConfig.domain);
    const csrfToken = setAuthCookies(res, rotated.rawToken);

    res.json({
      data: {
        token,
        csrfToken,
        user: { id: user.id, username: user.username, role: user.role }
      }
    });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function logout(req, res) {
  try {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (rawRefreshToken) {
      await revokeRefreshToken(req.db, rawRefreshToken);
    }
    clearAuthCookies(res);
    res.json({ data: { loggedOut: true } });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Lets the frontend know the caller's actual permission set, so it can
// hide/disable UI a role can't use instead of surfacing raw 403s. Reads
// live from onec_role_permissions (not a hardcoded copy), so it reflects
// any tenant-specific customization to a role's access.
async function me(req, res) {
  try {
    const permissions = await getPermissionsForRole(req);
    res.json({ data: { userId: req.user.userId, role: req.user.role, permissions } });
  } catch (err) {
    console.error('Failed to load current user permissions:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  login,
  refresh,
  logout,
  me
};
