const express = require('express');
const router = express.Router();
const controller = require('./controller');

// Login endpoint
// Note: This relies on the tenantResolver middleware running before it
router.post('/login', controller.login);

module.exports = router;
