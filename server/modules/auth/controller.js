const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { JWT_SECRET } = require('../../config/env');
const { getPermissionsForRole } = require('../../lib/permissions');

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
});

async function login(req, res) {
  try {
    // 1. Validate input
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });
    }
    const { username, password } = parsed.data;

    // 2. Ensure tenant context is set
    if (!req.db) {
      return res.status(500).json({ error: 'Tenant context missing' });
    }

    // 3. Query the user within the tenant's schema (req.db is already pinned to it)
    const result = await req.db.query('SELECT * FROM onec_users WHERE username = $1 AND is_active = true', [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = result.rows[0];

    // 4. Verify password
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // 5. Generate Token
    const payload = {
      userId: user.id,
      role: user.role,
      tenant: req.tenantConfig.domain
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

    res.json({
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      }
    });

  } catch (err) {
    console.error('Login error:', err);
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
  me
};
