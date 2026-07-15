const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const requirePermission = require('../../middleware/permissionGuard');

router.use(auth);

router.get('/', requirePermission('online_exams.view'), controller.listExams);
router.post('/', requirePermission('online_exams.manage'), controller.createExam);
router.get('/:id', requirePermission('online_exams.view'), controller.getExam);
router.put('/:id', requirePermission('online_exams.manage'), controller.updateExam);
router.delete('/:id', requirePermission('online_exams.manage'), controller.deleteExam);
router.put('/:id/publish', requirePermission('online_exams.manage'), controller.setPublished);

router.post('/:id/start', requirePermission('online_exams.take'), controller.startSubmission);
router.get('/:id/my-submission', requirePermission('online_exams.take'), controller.getMySubmission);
router.post('/:id/submit', requirePermission('online_exams.take'), controller.submitAnswers);

router.get('/:id/submissions', requirePermission('online_exams.grade'), controller.listSubmissions);
router.get('/submissions/:submissionId', requirePermission('online_exams.grade'), controller.getSubmissionDetail);
router.put('/submissions/:submissionId/grade', requirePermission('online_exams.grade'), controller.gradeSubmission);

module.exports = router;
