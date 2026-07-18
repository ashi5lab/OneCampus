const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const requirePermission = require('../../middleware/permissionGuard');

router.use(auth);
router.use(requirePermission('bulk_upload.manage'));

router.get('/template/:entityType', controller.requireValidEntityType, controller.downloadTemplate);

router.get('/jobs', controller.listJobs);
router.get('/jobs/:id', controller.getJob);
router.get('/jobs/:id/failures.xlsx', controller.downloadFailures);

// Manual .single() wrapping (same pattern as broadcast/routes.js's
// voicemail upload) so a multer rejection (wrong extension, over the size
// cap) becomes a clean 400 instead of an unhandled error.
router.post(
  '/:entityType/upload',
  controller.requireValidEntityType,
  (req, res, next) => {
    controller.upload.single('file')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  },
  controller.uploadFile
);

module.exports = router;
