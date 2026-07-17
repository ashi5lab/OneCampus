const multer = require('multer');
const bcrypt = require('bcrypt');
const { z } = require('zod');
const { isConfigured, uploadBuffer } = require('../../lib/cloudinary');
const { logAudit } = require('../../lib/audit');
const { listUsersWithNames } = require('../../lib/userDirectory');

const ALLOWED_MIME_TYPES = /^image\/(jpeg|png|webp|gif)$/;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.test(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, WEBP, or GIF images are allowed'));
    }
    cb(null, true);
  }
});

// Always uploads for the caller's own onec_users row — there's no
// "set someone else's picture" path in v1, keeping this endpoint's
// authorization trivial (any authenticated user, no permission check
// needed beyond being logged in).
async function uploadProfilePicture(req, res) {
  if (!isConfigured) {
    return res.status(503).json({ error: 'Image uploads are not configured for this deployment' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided (field name: "picture")' });
  }

  try {
    const folder = `onecampus/${req.tenantSchema}/profile-pictures`;
    const result = await uploadBuffer(req.file.buffer, { folder, publicId: `user-${req.user.userId}` });

    await req.db.query('UPDATE onec_users SET profile_picture_url = $1 WHERE id = $2', [
      result.secure_url,
      req.user.userId
    ]);

    res.json({ data: { profile_picture_url: result.secure_url } });
  } catch (err) {
    console.error('Profile picture upload error:', err);
    res.status(500).json({ error: 'Failed to upload image' });
  }
}

async function removeProfilePicture(req, res) {
  try {
    await req.db.query('UPDATE onec_users SET profile_picture_url = NULL WHERE id = $1', [req.user.userId]);
    res.json({ data: { profile_picture_url: null } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// The caller's own account details for the profile screen — deliberately
// separate from GET /auth/me (which is about session/permissions, called on
// every app load) so adding profile fields never bloats the auth hot path.
async function getMe(req, res) {
  try {
    const result = await req.db.query(
      'SELECT id, username, email, role, profile_picture_url FROM onec_users WHERE id = $1',
      [req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(8, 'New password must be at least 8 characters')
});

async function changeOwnPassword(req, res) {
  try {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });
    const { current_password, new_password } = parsed.data;

    const result = await req.db.query('SELECT password_hash FROM onec_users WHERE id = $1', [req.user.userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const match = await bcrypt.compare(current_password, result.rows[0].password_hash);
    if (!match) return res.status(400).json({ error: 'Current password is incorrect' });

    const newHash = await bcrypt.hash(new_password, 10);
    await req.db.query('UPDATE onec_users SET password_hash = $1 WHERE id = $2', [newHash, req.user.userId]);

    logAudit(req, 'user.password_changed', { user_id: req.user.userId, by: 'self' });
    res.json({ data: { changed: true } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// --- Admin: reset any user's password (users.manage_passwords) ---

// Picker list for the admin reset form. Includes inactive users on
// purpose — an admin may want to fix a locked-out/disabled account's
// credentials before re-enabling it.
async function listUsers(req, res) {
  try {
    const users = await listUsersWithNames(req, { includeInactive: true });
    res.json({ data: users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

const adminPasswordSchema = z.object({
  new_password: z.string().min(8, 'New password must be at least 8 characters')
});

// No current-password check here (that's the point — the user forgot it),
// but the acting admin's identity goes to the audit log.
async function adminChangePassword(req, res) {
  try {
    const { userId } = req.params;
    const parsed = adminPasswordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const newHash = await bcrypt.hash(parsed.data.new_password, 10);
    const result = await req.db.query(
      'UPDATE onec_users SET password_hash = $1 WHERE id = $2 RETURNING id, username',
      [newHash, userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    logAudit(req, 'user.password_changed', {
      user_id: result.rows[0].id,
      username: result.rows[0].username,
      by: 'admin',
      admin_user_id: req.user.userId
    });
    res.json({ data: { changed: true, username: result.rows[0].username } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  upload,
  uploadProfilePicture,
  removeProfilePicture,
  getMe,
  changeOwnPassword,
  listUsers,
  adminChangePassword
};
