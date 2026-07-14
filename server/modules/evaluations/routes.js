const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const moduleGuard = require('../../middleware/moduleGuard');

// Protect all routes with auth AND ensure the exams module is active
router.use(auth);
router.use(moduleGuard('exams'));

router.get('/', controller.listEvaluations);
router.post('/', controller.createEvaluation);
router.get('/:id', controller.getEvaluation);
router.put('/:id', controller.updateEvaluation);
router.delete('/:id', controller.removeEvaluation);

router.get('/:evaluationId/schedules', controller.listSchedules);
router.post('/:evaluationId/schedules', controller.createSchedule);
router.put('/schedules/:scheduleId', controller.updateSchedule);
router.delete('/schedules/:scheduleId', controller.removeSchedule);

router.get('/schedules/:scheduleId/scores', controller.listScores);
router.post('/schedules/:scheduleId/scores', controller.recordScore);

module.exports = router;
