const express = require('express');
const crypto = require('crypto');

const router = express.Router();

// Meta (WhatsApp Cloud API) webhook endpoint —
// https://api.onecampusedu.online/webhooks/whatsapp
//
// Two halves, per Meta's contract
// (developers.facebook.com/documentation/business-messaging/whatsapp/webhooks):
//
// 1. GET  — the one-time verification handshake when the URL is saved in
//           the app dashboard: echo back hub.challenge iff hub.verify_token
//           matches WHATSAPP_WEBHOOK_VERIFY_TOKEN (any string you choose;
//           enter the same value in the dashboard's "Verify token" field).
// 2. POST — event notifications (incoming messages, delivery/read status
//           updates). Meta expects a 200 within seconds and retries with
//           backoff on anything else, so events are acked immediately and
//           processed after.
//
// POST payloads are authenticated via X-Hub-Signature-256 — an HMAC-SHA256
// of the RAW request body keyed with the app secret (META_APP_SECRET).
// That's why this router is mounted BEFORE the global express.json() in
// server.js and parses the body itself with express.raw: a re-serialized
// parsed body wouldn't be byte-identical, and the HMAC would never match.
// Until META_APP_SECRET is configured, signature checking is skipped so the
// dashboard's test events still arrive during setup.

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '';
const APP_SECRET = process.env.META_APP_SECRET || '';

function handleVerification(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && VERIFY_TOKEN && token === VERIFY_TOKEN) {
    console.log('[whatsapp-webhook] verification handshake OK');
    return res.status(200).send(challenge);
  }
  console.warn('[whatsapp-webhook] verification rejected (mode/token mismatch or WHATSAPP_WEBHOOK_VERIFY_TOKEN unset)');
  return res.sendStatus(403);
}

function hasValidSignature(req) {
  if (!APP_SECRET) return true;
  const signature = req.headers['x-hub-signature-256'];
  if (!signature || !Buffer.isBuffer(req.body)) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(req.body).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

function handleEvent(req, res) {
  if (!hasValidSignature(req)) {
    console.warn('[whatsapp-webhook] dropped event with missing/invalid X-Hub-Signature-256');
    return res.sendStatus(401);
  }

  // Ack before processing — Meta only needs the 200, and treats slow
  // responses as failures worth retrying.
  res.sendStatus(200);

  let payload;
  try {
    payload = JSON.parse(req.body.toString('utf8'));
  } catch {
    console.warn('[whatsapp-webhook] non-JSON event body ignored');
    return;
  }

  try {
    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value || {};

        for (const message of value.messages || []) {
          console.log(
            `[whatsapp-webhook] incoming ${message.type || 'message'} from ${message.from}` +
              (message.text?.body ? `: ${message.text.body.slice(0, 200)}` : '')
          );
        }

        for (const status of value.statuses || []) {
          console.log(
            `[whatsapp-webhook] status ${status.status} for message ${status.id} (recipient ${status.recipient_id})`
          );
        }

        if (!value.messages && !value.statuses) {
          console.log(`[whatsapp-webhook] event field=${change.field}`);
        }
      }
    }
  } catch (err) {
    // Never let a processing bug bubble into a 5xx-after-ack crash loop.
    console.error('[whatsapp-webhook] event processing failed:', err);
  }
}

// Both spellings answer: /whatsapp is canonical; /whastapp matches the URL
// exactly as it was first entered in the Meta app dashboard, so whichever
// one the dashboard has saved keeps working.
for (const path of ['/whatsapp', '/whastapp']) {
  router.get(path, handleVerification);
  router.post(path, express.raw({ type: '*/*', limit: '2mb' }), handleEvent);
}

module.exports = router;
