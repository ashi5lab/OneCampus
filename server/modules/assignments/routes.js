const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const requirePermission = require('../../middleware/permissionGuard');

router.use(auth);

router.get('/', requirePermission('assignments.view'), controller.listAssignments);
router.post('/', requirePermission('assignments.manage'), controller.createAssignment);
router.put('/:id', requirePermission('assignments.manage'), controller.updateAssignment);
router.delete('/:id', requirePermission('assignments.manage'), controller.deleteAssignment);

router.get('/:id/submissions', requirePermission('assignments.view'), controller.listSubmissions);
router.post('/:id/submissions', requirePermission('assignments.submit'), controller.submit);
router.put('/submissions/:submissionId/grade', requirePermission('assignments.grade'), controller.grade);

module.exports = router;
