const multer = require('multer');
const { z } = require('zod');
const { isConfigured, uploadBuffer } = require('../../lib/cloudinary');
const { logAudit } = require('../../lib/audit');
const { listActiveUsers } = require('../../lib/userDirectory');
const { dispatchToAll, getActiveConfig } = require('../../lib/broadcastDispatch');

// 'whatsapp_absentee' has no manual send endpoint below — it's configured
// here (same generic Configuration UI as sms/voicemail) but only ever
// dispatched automatically by lib/whatsappNotify.js when attendance is
// marked absent. 'whatsapp' is the general manual-send channel (send an
// announcement to a class/all/specific users, same shape as SMS) — kept
// separate from 'whatsapp_absentee' because WhatsApp requires a
// pre-approved template per distinct message shape, so each needs its own
// onec_broadcast_configs row (different template name, different
// variables).
const CHANNELS = ['sms', 'voicemail', 'whatsapp_absentee', 'whatsapp'];

// --- Configuration ---

// A flat string->string record: header names, query params, variables.
// These three are always flat by nature (an HTTP header, a URL query
// param, and a named constant are all inherently one string each).
const stringRecord = z.record(z.string(), z.string());

// payload_template is not always flat — a WhatsApp Cloud API POST body
// nests a "template" object (name, language.code, components[]), which
// SMS/voicemail's {to, text}-style bodies never needed. Any JSON-shaped
// value is allowed per top-level key; server/lib/broadcastDispatch.js's
// substituteValue recurses through it, only replacing {{name}} inside
// actual string leaves.
const jsonValue = z.lazy(() => z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(jsonValue), z.record(z.string(), jsonValue)]));
const payloadRecord = z.record(z.string(), jsonValue);

const configSchema = z.object({
  api_url: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  http_method: z.enum(['POST', 'GET']).default('POST'),
  headers: stringRecord.default({}),
  payload_template: payloadRecord.default({}),
  params_template: stringRecord.default({}),
  variables: stringRecord.default({}),
  is_active: z.boolean().default(false)
});

async function getConfigs(req, res) {
  try {
    const result = await req.db.query('SELECT * FROM onec_broadcast_configs ORDER BY channel');
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function upsertConfig(req, res) {
  try {
    const { channel } = req.params;
    if (!CHANNELS.includes(channel)) return res.status(400).json({ error: 'Unknown channel' });

    const parsed = configSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });
    const { api_url, http_method, headers, payload_template, params_template, variables, is_active } = parsed.data;

    if (is_active && !api_url) {
      return res.status(400).json({ error: 'An API URL is required to activate a channel' });
    }

    const result = await req.db.query(
      `INSERT INTO onec_broadcast_configs (channel, api_url, http_method, headers, payload_template, params_template, variables, is_active, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
       ON CONFLICT (channel) DO UPDATE SET
         api_url = EXCLUDED.api_url, http_method = EXCLUDED.http_method, headers = EXCLUDED.headers,
         payload_template = EXCLUDED.payload_template, params_template = EXCLUDED.params_template,
         variables = EXCLUDED.variables, is_active = EXCLUDED.is_active,
         updated_by = EXCLUDED.updated_by, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        channel,
        api_url || null,
        http_method,
        JSON.stringify(headers),
        JSON.stringify(payload_template),
        JSON.stringify(params_template),
        JSON.stringify(variables),
        is_active,
        req.user.userId
      ]
    );

    logAudit(req, 'broadcast.config_updated', { channel, is_active });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// --- Recipient resolution ---

// Resolves an audience selection into [{ user_id, phone }], skipping users
// with no phone on file. Phone lives in different places per role:
// instructors/guardians have a phone column, learners keep it in meta.
// Plain admin/staff users have no phone field anywhere, so they're only
// reachable when a matching instructor/guardian/learner row exists.
async function resolveRecipients(req, audienceType, audienceIds) {
  let userFilter = '';
  const params = [];

  if (audienceType === 'users') {
    params.push(audienceIds);
    userFilter = `AND u.id = ANY($${params.length})`;
  } else if (audienceType === 'cohort') {
    params.push(audienceIds);
    userFilter = `AND u.id IN (SELECT user_id FROM onec_learners WHERE cohort_id = ANY($${params.length}) AND user_id IS NOT NULL)`;
  }
  // 'all' — no extra filter.

  const result = await req.db.query(
    `SELECT u.id AS user_id,
            COALESCE(i.phone, g.phone, l.meta->>'phone') AS phone
     FROM onec_users u
     LEFT JOIN onec_instructors i ON i.user_id = u.id
     LEFT JOIN onec_guardians g ON g.user_id = u.id
     LEFT JOIN onec_learners l ON l.user_id = u.id
     WHERE u.is_active = true ${userFilter}`,
    params
  );

  const withPhone = result.rows.filter((r) => r.phone);
  return { recipients: withPhone, skippedNoPhone: result.rows.length - withPhone.length };
}

// --- Broadcast list ---

const audienceSchema = z.object({
  audience_type: z.enum(['all', 'cohort', 'users']),
  audience_ids: z.array(z.number().int()).default([])
}).refine((data) => data.audience_type === 'all' || data.audience_ids.length > 0, {
  message: 'Choose at least one cohort/user for this audience',
  path: ['audience_ids']
});

async function listBroadcasts(req, res) {
  try {
    const { channel } = req.query;
    const params = [];
    let where = '';
    if (channel) {
      params.push(channel);
      where = ' WHERE b.channel = $1';
    }
    const result = await req.db.query(
      `SELECT b.*, u.username AS created_by_username, a.username AS approved_by_username
       FROM onec_broadcasts b
       LEFT JOIN onec_users u ON b.created_by = u.id
       LEFT JOIN onec_users a ON b.approved_by = a.id
       ${where}
       ORDER BY b.created_at DESC`,
      params
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Audience picker for the send forms (mirrors messages' recipient list,
// but gated by broadcast.manage since only senders need it).
async function listUsers(req, res) {
  try {
    const users = await listActiveUsers(req);
    res.json({ data: users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// --- SMS ---

const smsSchema = z.object({ message: z.string().min(1, 'Message is required').max(1600) });

async function sendSms(req, res) {
  try {
    const parsedAudience = audienceSchema.safeParse(req.body);
    if (!parsedAudience.success) return res.status(400).json({ error: 'Invalid input', details: parsedAudience.error.format() });
    const parsedSms = smsSchema.safeParse(req.body);
    if (!parsedSms.success) return res.status(400).json({ error: 'Invalid input', details: parsedSms.error.format() });

    const config = await getActiveConfig(req, 'sms');
    if (!config) return res.status(400).json({ error: 'SMS API is not configured or not active — set it up in the Configuration panel first' });

    const { audience_type, audience_ids } = parsedAudience.data;
    const { message } = parsedSms.data;
    const { recipients, skippedNoPhone } = await resolveRecipients(req, audience_type, audience_ids);

    const { sent, failed } = await dispatchToAll(config, recipients, { message });
    const sendResult = { sent, failed, skipped_no_phone: skippedNoPhone };

    const result = await req.db.query(
      `INSERT INTO onec_broadcasts (channel, message, status, audience_type, audience_ids, send_result, created_by, sent_at)
       VALUES ('sms', $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) RETURNING *`,
      [message, failed > 0 && sent === 0 ? 'failed' : 'sent', audience_type, JSON.stringify(audience_ids), JSON.stringify(sendResult), req.user.userId]
    );

    logAudit(req, 'broadcast.sms_sent', { broadcast_id: result.rows[0].id, ...sendResult });
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// --- WhatsApp (general announcements) ---

async function sendWhatsapp(req, res) {
  try {
    const parsedAudience = audienceSchema.safeParse(req.body);
    if (!parsedAudience.success) return res.status(400).json({ error: 'Invalid input', details: parsedAudience.error.format() });

    const config = await getActiveConfig(req, 'whatsapp');
    if (!config) return res.status(400).json({ error: 'WhatsApp API is not configured or not active — set it up in the Configuration panel first' });

    const { audience_type, audience_ids } = parsedAudience.data;

    // TESTING PHASE ONLY (tenant is still on Meta's free test number, which
    // can only message a handful of Meta-verified recipient numbers, and
    // every send uses the zero-variable 'hello_world' sample template — see
    // server/modules/broadcast/README.md). Real audience fan-out is
    // deliberately not wired up yet: every send here goes to exactly one
    // number, the "test_phone" static Variable set in the Configuration
    // panel, regardless of which audience was picked in the UI. The
    // audience picked is still recorded on the onec_broadcasts row so nothing
    // about "what would have been sent" is lost once real fan-out replaces
    // this — that's resolveRecipients + dispatchToAll(config, recipients, ...),
    // the exact same call sendSms already makes above.
    const testPhone = (config.variables || {}).test_phone;
    if (!testPhone) {
      return res.status(400).json({
        error: 'Testing phase: add a "test_phone" Variable (a Meta-verified test recipient number) in the WhatsApp Configuration panel before sending'
      });
    }

    const { sent, failed } = await dispatchToAll(config, [{ phone: testPhone }], {});
    const sendResult = { sent, failed, note: 'testing phase — sent to the configured test_phone only; real audience fan-out not yet enabled' };

    const result = await req.db.query(
      `INSERT INTO onec_broadcasts (channel, message, status, audience_type, audience_ids, send_result, created_by, sent_at)
       VALUES ('whatsapp', $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) RETURNING *`,
      [
        'WhatsApp test template',
        failed > 0 && sent === 0 ? 'failed' : 'sent',
        audience_type,
        JSON.stringify(audience_ids),
        JSON.stringify(sendResult),
        req.user.userId
      ]
    );

    logAudit(req, 'broadcast.whatsapp_sent', { broadcast_id: result.rows[0].id, ...sendResult });
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// --- Voicemail ---

const ALLOWED_AUDIO = /^audio\/(webm|ogg|mpeg|mp4|wav|x-wav|aac)/;
const uploadVoice = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB — a 30s opus/webm clip is well under this
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_AUDIO.test(file.mimetype)) return cb(new Error('Only audio recordings are allowed'));
    cb(null, true);
  }
});

const voicemailSchema = z.object({
  duration_seconds: z.coerce.number().int().min(1).max(30, 'Voicemail recordings are capped at 30 seconds')
});

async function createVoicemail(req, res) {
  if (!isConfigured) {
    return res.status(503).json({ error: 'Audio uploads are not configured for this deployment' });
  }
  if (!req.file) return res.status(400).json({ error: 'No audio file provided (field name: "voice")' });

  try {
    const parsed = voicemailSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const folder = `onecampus/${req.tenantSchema}/voicemails`;
    const uploaded = await uploadBuffer(req.file.buffer, {
      folder,
      publicId: `voicemail-${req.user.userId}-${Date.now()}`,
      resourceType: 'video' // Cloudinary's resource type for all audio/video
    });

    const result = await req.db.query(
      `INSERT INTO onec_broadcasts (channel, voice_url, duration_seconds, status, created_by)
       VALUES ('voicemail', $1, $2, 'pending_approval', $3) RETURNING *`,
      [uploaded.secure_url, parsed.data.duration_seconds, req.user.userId]
    );

    logAudit(req, 'broadcast.voicemail_submitted', { broadcast_id: result.rows[0].id });
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('Voicemail upload error:', err);
    res.status(500).json({ error: 'Failed to upload recording' });
  }
}

async function approveVoicemail(req, res) {
  try {
    const { id } = req.params;
    const result = await req.db.query(
      `UPDATE onec_broadcasts SET status = 'approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP, rejection_reason = NULL
       WHERE id = $2 AND channel = 'voicemail' AND status = 'pending_approval' RETURNING *`,
      [req.user.userId, id]
    );
    if (result.rows.length === 0) return res.status(400).json({ error: 'Voicemail not found or not awaiting approval' });

    logAudit(req, 'broadcast.voicemail_approved', { broadcast_id: result.rows[0].id });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

const rejectSchema = z.object({ reason: z.string().max(500).optional() });

async function rejectVoicemail(req, res) {
  try {
    const { id } = req.params;
    const parsed = rejectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const result = await req.db.query(
      `UPDATE onec_broadcasts SET status = 'rejected', approved_by = $1, approved_at = CURRENT_TIMESTAMP, rejection_reason = $2
       WHERE id = $3 AND channel = 'voicemail' AND status = 'pending_approval' RETURNING *`,
      [req.user.userId, parsed.data.reason ?? null, id]
    );
    if (result.rows.length === 0) return res.status(400).json({ error: 'Voicemail not found or not awaiting approval' });

    logAudit(req, 'broadcast.voicemail_rejected', { broadcast_id: result.rows[0].id });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Sharing/sending an approved voicemail to an audience. Stays 'approved'
// (not a terminal 'sent') on purpose — the same approved recording can be
// shared to different audiences repeatedly; each send is recorded in
// send_result/sent_at for the most recent dispatch.
async function sendVoicemail(req, res) {
  try {
    const { id } = req.params;
    const parsed = audienceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const voicemail = await req.db.query(
      `SELECT * FROM onec_broadcasts WHERE id = $1 AND channel = 'voicemail'`,
      [id]
    );
    if (voicemail.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (voicemail.rows[0].status !== 'approved' && voicemail.rows[0].status !== 'sent') {
      return res.status(400).json({ error: 'Only an approved voicemail can be shared' });
    }

    const config = await getActiveConfig(req, 'voicemail');
    if (!config) return res.status(400).json({ error: 'Voicemail API is not configured or not active — set it up in the Configuration panel first' });

    const { audience_type, audience_ids } = parsed.data;
    const { recipients, skippedNoPhone } = await resolveRecipients(req, audience_type, audience_ids);

    const { sent, failed } = await dispatchToAll(config, recipients, { voice_url: voicemail.rows[0].voice_url });
    const sendResult = { sent, failed, skipped_no_phone: skippedNoPhone };

    const result = await req.db.query(
      `UPDATE onec_broadcasts
       SET status = 'sent', audience_type = $1, audience_ids = $2, send_result = $3, sent_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [audience_type, JSON.stringify(audience_ids), JSON.stringify(sendResult), id]
    );

    logAudit(req, 'broadcast.voicemail_sent', { broadcast_id: result.rows[0].id, ...sendResult });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  getConfigs,
  upsertConfig,
  listBroadcasts,
  listUsers,
  sendSms,
  sendWhatsapp,
  uploadVoice,
  createVoicemail,
  approveVoicemail,
  rejectVoicemail,
  sendVoicemail
};
