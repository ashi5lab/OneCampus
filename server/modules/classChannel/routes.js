const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');

router.use(auth);

// No requirePermission gate — access is cohort-membership-based
// (canAccessCohort/canModerateCohort inside the controller), the same
// "everyone can use this, scoped to what's theirs" shape as the messages
// module.
router.get('/my-cohorts', controller.listMyCohorts);
router.get('/cohorts/:cohortId/members', controller.listMembers);
router.get('/cohorts/:cohortId/members/paginated', controller.listMembersPaginated);
router.get('/cohorts/:cohortId/posts', controller.listPosts);

// multer's .single() is called manually so a rejected upload (wrong
// mimetype, over the 15MB cap) resolves to a clean 400 here instead of
// falling through to server.js's generic 500 handler — same pattern as
// modules/profile/routes.js's picture upload.
function attachOptional(req, res, next) {
  controller.upload.single('attachment')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}

router.post('/cohorts/:cohortId/posts', attachOptional, controller.createPost);
router.post('/posts/:postId/replies', attachOptional, controller.createReply);

// Documents tab — a standalone per-cohort file library (not chat
// attachments). Same manual multer-error-to-400 handling as posts, but the
// file field is 'file' and it's required (enforced in the controller).
function attachDocument(req, res, next) {
  controller.upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}
router.get('/cohorts/:cohortId/documents', controller.listDocuments);
router.post('/cohorts/:cohortId/documents', attachDocument, controller.uploadDocument);
router.delete('/documents/:id', controller.deleteDocument);

// :id (not :postId/:replyId) — editMessage/getEditHistory/deleteMessage in
// the controller are shared between posts and replies and read req.params.id.
router.patch('/posts/:id', controller.editPost);
router.patch('/replies/:id', controller.editReply);
router.get('/posts/:id/edits', controller.getPostEditHistory);
router.get('/replies/:id/edits', controller.getReplyEditHistory);
router.delete('/posts/:id', controller.deletePost);
router.delete('/replies/:id', controller.deleteReply);

router.put('/posts/:postId/reaction', controller.setReaction);

router.put('/cohorts/:cohortId/pin', controller.pinPost);
router.delete('/cohorts/:cohortId/pin', controller.unpinPost);

module.exports = router;
