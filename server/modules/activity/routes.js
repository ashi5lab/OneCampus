const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');

router.use(auth);

// Everyone gets a feed, self-scoped by role/cohort inside the controller —
// same "no permission gate, row-scoping does the work" shape as messages
// and reports' dashboard() endpoint.
router.get('/', controller.listActivities);

module.exports = router;
