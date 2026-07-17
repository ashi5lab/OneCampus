const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const requirePermission = require('../../middleware/permissionGuard');

router.use(auth);
router.use(requirePermission('timetable.view'));

// A single cohort's weekly grid — ?cohort_id=X is required. This is what
// the frontend's per-class Timetable view renders.
router.get('/', controller.getAll);
// A learner/guardian's own class(es), for populating a "which class" picker
// without needing cohorts.view.
router.get('/my-cohorts', controller.getMyCohorts);
// An instructor's own cross-cohort schedule ("which classes am I teaching,
// and when").
router.get('/mine', controller.getMine);

router.post('/', requirePermission('timetable.manage'), controller.create);
router.put('/:id', requirePermission('timetable.manage'), controller.update);
router.delete('/:id', requirePermission('timetable.manage'), controller.remove);

module.exports = router;
