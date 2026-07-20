const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');

router.use(auth);

// No requirePermission gate — access is cohort-membership-based
// (canAccessCohort inside the controller), the same "everyone can use this,
// scoped to what's theirs" shape as the messages module.
router.get('/my-cohorts', controller.listMyCohorts);
router.get('/cohorts/:cohortId/posts', controller.listPosts);
router.post('/cohorts/:cohortId/posts', controller.createPost);
router.post('/posts/:postId/replies', controller.createReply);

module.exports = router;
