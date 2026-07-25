const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const requirePermission = require('../../middleware/permissionGuard');

router.use(auth);

// List + create
router.get('/',  requirePermission('assignments.view'),   controller.listAssignments);
router.post('/', requirePermission('assignments.manage'), controller.createAssignment);

// Per-assignment CRUD
router.get('/:id',            requirePermission('assignments.view'),   controller.getAssignment);
router.put('/:id',            requirePermission('assignments.manage'), controller.updateAssignment);
router.delete('/:id',         requirePermission('assignments.manage'), controller.deleteAssignment);
router.post('/:id/duplicate', requirePermission('assignments.manage'), controller.duplicateAssignment);
router.patch('/:id/publish',  requirePermission('assignments.manage'), controller.togglePublish);
router.patch('/:id/complete', requirePermission('assignments.grade'),  controller.completeValuation);

// Valuation (grading flow)
router.get('/:id/valuation',  requirePermission('assignments.grade'),  controller.getValuationStudents);
router.post('/:id/grade',     requirePermission('assignments.grade'),  controller.upsertGrade);

// Activity log
router.get('/:id/activity',   requirePermission('assignments.view'),   controller.getActivity);

// Learner submission (kept for learner self-view)
router.get('/:id/submissions',                 requirePermission('assignments.view'),   controller.listSubmissions);
router.post('/:id/submissions',                requirePermission('assignments.submit'), controller.submit);
router.put('/submissions/:submissionId/grade', requirePermission('assignments.grade'),  controller.grade);

module.exports = router;
