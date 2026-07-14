const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { JWT_SECRET } = require('../../config/env');

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

module.exports = {
  login
};
