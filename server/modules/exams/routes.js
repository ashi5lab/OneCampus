const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const requirePermission = require('../../middleware/permissionGuard');

router.use(auth);

// List + create
router.get('/',  requirePermission('exams.view'),   controller.listExams);
router.post('/', requirePermission('exams.manage'), controller.createExam);

// Per-exam CRUD
router.get('/:id',            requirePermission('exams.view'),   controller.getExam);
router.put('/:id',            requirePermission('exams.manage'), controller.updateExam);
router.delete('/:id',         requirePermission('exams.manage'), controller.deleteExam);
router.post('/:id/duplicate', requirePermission('exams.manage'), controller.duplicateExam);
router.patch('/:id/publish',  requirePermission('exams.manage'), controller.togglePublish);
router.patch('/:id/complete', requirePermission('exams.grade'),  controller.completeValuation);

// Valuation (grading flow)
router.get('/:id/valuation',  requirePermission('exams.grade'),  controller.getValuationStudents);
router.post('/:id/grade',     requirePermission('exams.grade'),  controller.upsertGrade);

// Activity log
router.get('/:id/activity',   requirePermission('exams.view'),   controller.getActivity);

// Learner submission (self-view)
router.get('/:id/submissions',  requirePermission('exams.view'),   controller.listSubmissions);

module.exports = router;
