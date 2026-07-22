const express = require('express');
const { WHATSAPP_WEBHOOK_VERIFY_TOKEN } = require('../../config/env');

const router = express.Router();

// Meta subscription verification — responds with hub.challenge as plain text.
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).type('text/plain').send(challenge);
  }

  return res.sendStatus(403);
});

// Inbound webhook events — acknowledge quickly; processing is out of scope for v1.
router.post('/', (req, res) => {
  const object = req.body?.object;
  console.log('[whatsapp-webhook] received event', { object });
  res.sendStatus(200);
});

module.exports = router;
