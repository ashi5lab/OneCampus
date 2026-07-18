// The generic "describe a provider's HTTP call, we'll fill in the blanks"
// dispatcher backing server/modules/broadcast — extracted from there so
// other event-triggered sends (e.g. lib/whatsappNotify.js's absentee
// alert) can reuse the exact same executor against a differently-purposed
// onec_broadcast_configs row, instead of re-implementing HTTP dispatch.

// {{name}} substitution over every value in a template record. Runtime
// variables (phone, message, learner_name, ...) take precedence over the
// static ones saved in the config, so a config author can't accidentally
// shadow the per-send values.
//
// payload_template values aren't always flat strings — a WhatsApp Cloud API
// body nests a "template" object (name, language.code, components[]), which
// SMS/voicemail's flat {to, text}-style payloads never needed. substituteValue
// recurses through objects/arrays and only replaces placeholders inside
// actual string leaves, so the JSON shape survives untouched; a config author
// writing plain string values (the SMS/voicemail case) sees the exact same
// behavior as before.
function substituteValue(value, merged) {
  if (typeof value === 'string') {
    return value.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, name) => merged[name] ?? '');
  }
  if (Array.isArray(value)) {
    return value.map((item) => substituteValue(item, merged));
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, nested] of Object.entries(value)) out[key] = substituteValue(nested, merged);
    return out;
  }
  return value;
}

function substitute(template, staticVars, runtimeVars) {
  const merged = { ...staticVars, ...runtimeVars };
  const out = {};
  for (const [key, value] of Object.entries(template)) {
    out[key] = substituteValue(value, merged);
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
  const result = await req.db.query('SELECT * FROM onec_broadcast_configs WHERE channel = $1 AND is_active = true', [channel]);
  return result.rows[0] || null;
}

module.exports = { substitute, dispatchOne, dispatchToAll, getActiveConfig };
