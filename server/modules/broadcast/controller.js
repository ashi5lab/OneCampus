const multer = require('multer');
const { z } = require('zod');
const { isConfigured, uploadBuffer } = require('../../lib/cloudinary');
const { logAudit } = require('../../lib/audit');

const CHANNELS = ['sms', 'voicemail'];

// --- Configuration ---

// A flat string->string record: header names, template fields, variables.
const stringRecord = z.record(z.string(), z.string());

const configSchema = z.object({
  api_url: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  http_method: z.enum(['POST', 'GET']).default('POST'),
  headers: stringRecord.default({}),
  payload_template: stringRecord.default({}),
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

// --- Outbound dispatch ---

// {{name}} substitution over every value in a template record. Runtime
// variables (phone, message, voice_url) take precedence over the static
// ones saved in the config, so a config author can't accidentally shadow
// the per-recipient values.
function substitute(template, staticVars, runtimeVars) {
  const merged = { ...staticVars, ...runtimeVars };
  const out = {};
  for (const [key, value] of Object.entries(template)) {
    out[key] = String(value).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, name) => merged[name] ?? '');
  }
  return out;
}

async function dispatchOne(config, runtimeVars) {
  const staticVars = config.variables || {};
  const headers = substitute(config.headers || {}, staticVars, runtimeVars);

  if (config.http_method === 'GET') {
    const params = substitute(config.params_template || {}, staticVars, runtimeVars);
    const url = new URL(config.api_url);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    const response = await fetch(url, { method: 'GET', headers, signal: AbortSignal.timeout(10000) });
    return response.ok;
  }

  const payload = substitute(config.payload_template || {}, staticVars, runtimeVars);
  const response = await fetch(config.api_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000)
  });
  return response.ok;
}

// Sends to every recipient sequentially — fine at school scale (hundreds,
// not millions), keeps us clear of provider rate limits, and means one
// hung request can't stampede the rest (each has its own 10s timeout).
async function dispatchToAll(config, recipients, baseVars) {
  let sent = 0;
  let failed = 0;
  for (const recipient of recipients) {
    try {
      const ok = await dispatchOne(config, { ...baseVars, phone: recipient.phone });
      ok ? sent++ : failed++;
    } catch {
      failed++;
    }
  }
  return { sent, failed };
}

async function getActiveConfig(req, channel) {
  const result = await req.db.query('SELECT * FROM onec_broadcast_configs WHERE channel = $1 AND is_active = true', [
    channel
  ]);
  return result.rows[0] || null;
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
    const result = await req.db.query('SELECT id, username, role FROM onec_users WHERE is_active = true ORDER BY role, username');
    res.json({ data: result.rows });
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
  uploadVoice,
  createVoicemail,
  approveVoicemail,
  rejectVoicemail,
  sendVoicemail
};
