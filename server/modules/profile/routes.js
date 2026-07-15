const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');

router.use(auth);

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
