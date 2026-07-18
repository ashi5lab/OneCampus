const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');

// No requirePermission at the route level — each handler allows either
// id_cards.generate or "this is my own card" (see controller.js), which a
// single route-level permission check can't express. Mirrors how
// certificates.getById/getPdf handle the same self-or-permission shape.
router.use(auth);

router.get('/learner/:id/pdf', controller.learnerCard);
router.get('/instructor/:id/pdf', controller.instructorCard);
router.get('/staff/:id/pdf', controller.staffCard);

module.exports = router;
