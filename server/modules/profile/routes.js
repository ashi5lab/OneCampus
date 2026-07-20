const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const requirePermission = require('../../middleware/permissionGuard');

router.use(auth);

router.get('/me', controller.getMe);
router.put('/password', controller.changeOwnPassword);
router.get('/notification-preferences', controller.getNotificationPreferences);
router.put('/notification-preferences', controller.updateNotificationPreferences);
router.get('/home-card-prefs', controller.getHomeCardPrefs);
router.put('/home-card-prefs', controller.updateHomeCardPrefs);

// Admin-side password reset — the only /profile routes that touch a user
// other than the caller, hence the only permission-gated ones here.
router.get('/users', requirePermission('users.manage_passwords'), controller.listUsers);
router.put('/users/:userId/password', requirePermission('users.manage_passwords'), controller.adminChangePassword);
router.post('/users/:userId/force-logout', requirePermission('users.manage_passwords'), controller.forceLogoutUser);

// multer's .single() is called manually (not just handed to the router)
// so a rejected upload (wrong mimetype, over the 5MB cap) resolves to a
// clean 400 here instead of falling through to server.js's generic 500
// error handler, which doesn't know anything about multer-specific errors.
router.post('/picture', (req, res, next) => {
  controller.upload.single('picture')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, controller.uploadProfilePicture);

router.delete('/picture', controller.removeProfilePicture);

module.exports = router;
