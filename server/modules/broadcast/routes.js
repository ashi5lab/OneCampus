const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../../middleware/auth');
const requirePermission = require('../../middleware/permissionGuard');

router.use(auth);

// Config holds provider credentials — admin-only by default.
router.get('/config', requirePermission('broadcast.configure'), controller.getConfigs);
router.put('/config/:channel', requirePermission('broadcast.configure'), controller.upsertConfig);

router.get('/', requirePermission('broadcast.view'), controller.listBroadcasts);
router.get('/users', requirePermission('broadcast.manage'), controller.listUsers);

router.post('/sms', requirePermission('broadcast.manage'), controller.sendSms);
router.post('/whatsapp', requirePermission('broadcast.manage'), controller.sendWhatsapp);
router.post('/whatsapp-absentee/send', requirePermission('broadcast.manage'), controller.sendAbsenteeAlertsNow);

// Same manual .single() wrapping as profile/routes.js — converts multer
// rejections (wrong mimetype, over the size cap) into clean 400s.
router.post(
  '/voicemails',
  requirePermission('broadcast.manage'),
  (req, res, next) => {
    controller.uploadVoice.single('voice')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  },
  controller.createVoicemail
);
router.put('/voicemails/:id/approve', requirePermission('broadcast.approve'), controller.approveVoicemail);
router.put('/voicemails/:id/reject', requirePermission('broadcast.approve'), controller.rejectVoicemail);
router.post('/voicemails/:id/send', requirePermission('broadcast.manage'), controller.sendVoicemail);

module.exports = router;
