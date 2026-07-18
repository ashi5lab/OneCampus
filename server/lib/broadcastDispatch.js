// The generic "describe a provider's HTTP call, we'll fill in the blanks"
// dispatcher backing server/modules/broadcast — extracted from there so
// other event-triggered sends (e.g. lib/absenteeDigest.js's batched
// absentee alert) can reuse the exact same executor against a
// differently-purposed onec_broadcast_configs row, instead of
// re-implementing HTTP dispatch.

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

// Returns { ok, detail } rather than a bare boolean — detail is null on
// success, and on failure is either "HTTP <status>: <response body>" (a
// non-2xx from the provider — this is where a Twilio-style JSON error
// body with its own message/code ends up) or a thrown error's .message
// (DNS failure, connection refused, the 10s AbortSignal timing out, ...).
// Without this, a failed send was previously indistinguishable from a
// misconfigured one — every failure mode collapsed to the same bare
// {sent: 0, failed: 1}, which is exactly the debugging dead end that
// prompted adding this.
async function dispatchOne(config, runtimeVars) {
  const staticVars = config.variables || {};
  const headers = substitute(config.headers || {}, staticVars, runtimeVars);

  try {
    if (config.http_method === 'GET') {
      const params = substitute(config.params_template || {}, staticVars, runtimeVars);
      const url = new URL(config.api_url);
      for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
      const response = await fetch(url, { method: 'GET', headers, signal: AbortSignal.timeout(10000) });
      if (response.ok) return { ok: true, detail: null };
      const bodyText = await response.text().catch(() => '');
      return { ok: false, detail: `HTTP ${response.status}: ${bodyText.slice(0, 500)}` };
    }

    const payload = substitute(config.payload_template || {}, staticVars, runtimeVars);

    // Most providers (the original design target) take a JSON body. Some —
    // Twilio's REST API is the concrete case this was added for — require
    // application/x-www-form-urlencoded instead; URLSearchParams stringifies
    // every value, so a nested payload_template value (never used by a
    // form-encoded provider in practice) would serialize as "[object Object]"
    // rather than failing outright.
    const isForm = config.body_encoding === 'form';
    const body = isForm ? new URLSearchParams(payload).toString() : JSON.stringify(payload);
    const defaultContentType = isForm ? 'application/x-www-form-urlencoded' : 'application/json';

    const response = await fetch(config.api_url, {
      method: 'POST',
      headers: { 'Content-Type': defaultContentType, ...headers },
      body,
      signal: AbortSignal.timeout(10000)
    });
    if (response.ok) return { ok: true, detail: null };
    const bodyText = await response.text().catch(() => '');
    return { ok: false, detail: `HTTP ${response.status}: ${bodyText.slice(0, 500)}` };
  } catch (err) {
    // fetch()'s own thrown message is a generic "fetch failed" for every
    // network-level failure (DNS, connection refused, TLS, the 10s
    // AbortSignal) — the actually useful detail (e.g. "ECONNREFUSED",
    // "getaddrinfo ENOTFOUND ...") lives one level down on err.cause.
    return { ok: false, detail: err.cause ? `${err.message}: ${err.cause.message || err.cause}` : err.message };
  }
}

// Sends to every recipient sequentially — fine at school scale (hundreds,
// not millions), keeps us clear of provider rate limits, and means one
// hung request can't stampede the rest (each has its own 10s timeout).
// lastError surfaces whichever failure happened most recently, so a
// single-recipient send (WhatsApp test phase, absentee digest) always
// shows exactly why it failed; for a real multi-recipient SMS/voicemail
// blast it's necessarily just "the last one", not a per-recipient log —
// see the README's already-documented limitation on that.
async function dispatchToAll(config, recipients, baseVars) {
  let sent = 0;
  let failed = 0;
  let lastError = null;
  for (const recipient of recipients) {
    const { ok, detail } = await dispatchOne(config, { ...baseVars, phone: recipient.phone });
    if (ok) sent++;
    else {
      failed++;
      lastError = detail;
    }
  }
  return { sent, failed, lastError };
}

async function getActiveConfig(req, channel) {
  const result = await req.db.query('SELECT * FROM onec_broadcast_configs WHERE channel = $1 AND is_active = true', [channel]);
  return result.rows[0] || null;
}

module.exports = { substitute, dispatchOne, dispatchToAll, getActiveConfig };
