const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const moduleGuard = require('../../middleware/moduleGuard');
const requirePermission = require('../../middleware/permissionGuard');

// Protect all routes with auth AND ensure the exams module is active
router.use(auth);
router.use(moduleGuard('exams'));

router.get('/', requirePermission('evaluations.view'), controller.listEvaluations);
router.post('/', requirePermission('evaluations.manage'), controller.createEvaluation);
router.get('/:id', requirePermission('evaluations.view'), controller.getEvaluation);
router.put('/:id', requirePermission('evaluations.manage'), controller.updateEvaluation);
router.delete('/:id', requirePermission('evaluations.manage'), controller.removeEvaluation);

router.get('/:evaluationId/schedules', requirePermission('evaluations.view'), controller.listSchedules);
router.post('/:evaluationId/schedules', requirePermission('evaluations.manage'), controller.createSchedule);
router.put('/schedules/:scheduleId', requirePermission('evaluations.manage'), controller.updateSchedule);
router.delete('/schedules/:scheduleId', requirePermission('evaluations.manage'), controller.removeSchedule);

router.get('/schedules/:scheduleId/scores', requirePermission('evaluations.view'), controller.listScores);
router.post('/schedules/:scheduleId/scores', requirePermission('evaluations.grade'), controller.recordScore);

module.exports = router;
