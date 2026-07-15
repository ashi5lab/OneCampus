const multer = require('multer');
const { isConfigured, uploadBuffer } = require('../../lib/cloudinary');

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

module.exports = { upload, uploadProfilePicture, removeProfilePicture };
