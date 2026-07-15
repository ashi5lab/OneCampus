const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const requirePermission = require('../../middleware/permissionGuard');

router.use(auth);
router.use(requirePermission('reports.view'));

router.get('/overview', controller.overview);
router.get('/attendance', controller.attendance);
router.get('/academic-performance', controller.academicPerformance);
router.get('/assignments', controller.assignmentsReport);
router.get('/online-exams', controller.onlineExamsReport);
router.get('/library', controller.libraryReport);
router.get('/certificates', controller.certificatesReport);

module.exports = router;
