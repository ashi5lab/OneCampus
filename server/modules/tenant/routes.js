const express = require('express');
const router = express.Router();
const controller = require('./controller');

// No auth required — this is what the frontend fetches on load, before login,
// to know which modules/vocabulary/branding to render.
router.get('/config', controller.getConfig);

module.exports = router;
