const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const requirePermission = require('../../middleware/permissionGuard');

router.use(auth);

// Every authenticated user hits this — deliberately NOT behind
// requirePermission('reports.view') below, since it self-scopes: admin/
// anyone with reports.view gets the full tenant-wide payload, everyone else
// gets a "my activity" slice instead of a 403 (see controller.js's
// dashboard()). This is the Dashboard page's default view.
router.get('/dashboard', controller.dashboard);

router.use(requirePermission('reports.view'));

router.get('/overview', controller.overview);
router.get('/analytics', controller.analytics);
router.get('/attendance', controller.attendance);
router.get('/academic-performance', controller.academicPerformance);
router.get('/assignments', controller.assignmentsReport);
router.get('/online-exams', controller.onlineExamsReport);
router.get('/library', controller.libraryReport);
router.get('/certificates', controller.certificatesReport);

module.exports = router;
