# Broadcast Module (SMS + Voicemail + WhatsApp)

**Purpose**: Outbound messaging with a per-tenant, per-channel HTTP API configuration so a real provider can be wired in later **without any code change** — the tenant admin describes the provider's HTTP call in the Configuration panel (shared across every channel, see `client/src/features/broadcast/components/ChannelConfigModal.jsx`), and every send renders that description per recipient. `server/lib/broadcastDispatch.js` is the one HTTP-call executor every channel goes through (`{{name}}` substitution, POST/GET, JSON or form-encoded body, 10s timeout).

Three channels are manually composed and sent by an admin (SMS, Voicemail, `whatsapp`); `whatsapp_absentee` has no compose form (see below) — because WhatsApp requires a pre-approved message *template* for anything business-initiated, not a freeform string, so there's no "type a message" UI that actually does anything for either WhatsApp channel the way there is for SMS. `whatsapp`'s message box is present but inert for the same reason (see `WhatsappTab.jsx`'s `draftMessage`).

**`whatsapp` is currently in a deliberate testing-phase mode** (see `sendWhatsapp` in `controller.js`): the tenant is still on a free/sandbox provider number (Meta's test number or Twilio's WhatsApp sandbox), which can only message a handful of verified recipient numbers, using a fixed, variable-free template (Meta's `hello_world` sample, or a Twilio Content template referenced by `ContentSid`). The audience picker (class/all/specific users) is fully built and wired, but every send goes to exactly one number — the `test_phone` Variable set in that channel's Configuration — regardless of the audience picked; the picked audience is still recorded on the `onec_broadcasts` row. Swapping in real fan-out later is a small change (reuse `resolveRecipients` + `dispatchToAll(config, recipients, ...)`, the exact call `sendSms` already makes) once the tenant has a business-verified number that can message anyone, and a real approved template with body variables to send.

## Configuration model (`onec_broadcast_configs`, one row per channel)

- `api_url` + `http_method` (`POST` or `GET`).
- `headers` — string map, e.g. `{"Authorization": "Bearer {{apikey}}"}`. For Twilio's Basic Auth, set `Authorization` to `Basic <base64(AccountSid:AuthToken)>` computed ahead of time — there's no dedicated Basic Auth field, a static header value is enough.
- `body_encoding` — `'json'` (default) or `'form'`. Most providers (the original design target) take a JSON body; Twilio's REST API requires `application/x-www-form-urlencoded` instead — `'form'` switches `dispatchOne` (`server/lib/broadcastDispatch.js`) to `URLSearchParams`-encode `payload_template` and default the Content-Type header accordingly (still overridable via `headers`).
- `payload_template` — the POST body. Flat for SMS/voicemail (`{"to": "{{phone}}", "text": "{{message}}"}`) and for a form-encoded Twilio config (`{"From": "whatsapp:+1...", "To": "whatsapp:+91{{phone}}", "ContentSid": "HX...", "ContentVariables": "{\"1\":\"...\"}"}`), but any value can be a nested object/array for a JSON provider — needed for e.g. a WhatsApp Cloud API `{"template": {"name": "...", "language": {"code": "en_US"}}}` shape. `{{name}}` substitution recurses through nesting (see `substituteValue`); the Configuration panel offers both a flat Key/Value editor and a Raw JSON editor for this field, defaulting to whichever one can represent what's already saved.
- `params_template` — string map used as URL query params when method is GET (always flat — a URL query string has no nesting concept).
- `variables` — static string map (`{"apikey": "..."}`) substituted into all templates via `{{name}}` placeholders.
- **Runtime variables** (always available, take precedence over static ones): `{{phone}}` (per recipient) plus, per channel — SMS: `{{message}}`; voicemail: `{{voice_url}}`; `whatsapp_absentee`: `{{count}}` (number of today's absentees), `{{learner_name}}` (the one absentee's name, or `"N students"` if more than one — see below), `{{cohort_name}}`, `{{date}}` (no `{{message}}` — the message text itself lives in the pre-approved WhatsApp template).
- `is_active` — sends fail with a clear 400 until the channel is configured *and* activated.
- `absentee_mode` / `absentee_schedule_time` / `absentee_schedule_day` / `absentee_last_sent_date` — only meaningful on the `whatsapp_absentee` row, see below.

## Endpoints

- `GET /api/v1/broadcast/config` / `PUT /api/v1/broadcast/config/:channel` — **`broadcast.configure` (admin-only by default)**, since the config holds provider credentials. `:channel` is any of `sms` | `voicemail` | `whatsapp` | `whatsapp_absentee`.
- `GET /api/v1/broadcast?channel=sms|voicemail|whatsapp|whatsapp_absentee` — history (`broadcast.view`).
- `GET /api/v1/broadcast/users` — audience picker (`broadcast.manage`).
- `POST /api/v1/broadcast/sms` — `{ message, audience_type: 'all'|'cohort'|'users', audience_ids }`. Resolves recipients, dispatches one API call per recipient (sequential, 10s timeout each), records `{sent, failed, skipped_no_phone}`.
- `POST /api/v1/broadcast/whatsapp` — `{ audience_type: 'all'|'cohort'|'users', audience_ids }` (no `message` — see the testing-phase note above). Currently always dispatches exactly once, to the `whatsapp` channel config's `test_phone` Variable; `audience_type`/`audience_ids` are recorded but not yet used to resolve real recipients.
- `POST /api/v1/broadcast/voicemails` — multipart (`voice` field, audio mimetypes, 3MB cap) + `duration_seconds` (server-validated ≤ 30). Uploads to Cloudflare R2 (`onecampus/<tenant_schema>/voicemails/`, via `lib/storage.js`) and creates a `pending_approval` row.
- `PUT /api/v1/broadcast/voicemails/:id/approve` / `.../reject` — `broadcast.approve` (admin/staff). Reject takes an optional `{ reason }`.
- `POST /api/v1/broadcast/voicemails/:id/send` — `broadcast.manage`; only `approved` (or previously `sent`) voicemails can be shared, to the same audience shapes as SMS. A voicemail can be re-shared to a different audience; `send_result`/`sent_at` reflect the latest dispatch.
- `POST /api/v1/broadcast/whatsapp-absentee/send` — `broadcast.manage`. Manually fires today's (or `?date=`) absentee digest right now, regardless of the configured `absentee_mode` — see below.

## Absentee alerts (`whatsapp_absentee`)

Replaced an earlier design that fired instantly on every single present/late/excused → absent transition (one WhatsApp call per learner-guardian pair) with an explicit, configurable **daily batch**, because the channel is still on a free/sandbox provider tier that can't sustain per-event sends at any real scale (a class of 100 absentees would have been 100+ calls). `server/lib/absenteeDigest.js`'s `sendAbsenteeDigest(db, { date, createdBy })` is the one function every trigger below calls — it looks up every learner marked `absent` on `date` with at least one `whatsapp_opt_in = true` guardian with a phone on file, and makes **exactly one** `dispatchOne` call (to the `whatsapp_absentee` config's `test_phone`, same testing-phase constraint as the `whatsapp` channel above) summarizing all of them, then records **one** `onec_broadcasts` row. Zero matching absentees is a no-op (no send, no row).

`onec_broadcast_configs.absentee_mode` picks how it fires, set via the same Configuration modal as every other channel:
- `'manual'` (default) — never fires on its own; only the "Send Absentee Alerts Now" button (`POST /whatsapp-absentee/send`) on the Broadcast page's WhatsApp Absentee Alerts tab triggers it.
- `'daily'` — `server/lib/absenteeScheduler.js` fires it once, automatically, at `absentee_schedule_time` (server-local time, `HH:MM`) every day.
- `'weekly'` — same, but only on `absentee_schedule_day` (0=Sunday..6=Saturday).

The manual button works in every mode (an admin can always send right now, even with a schedule configured) — it's the scheduled *automatic* firing that's mode-gated.

`server/lib/absenteeScheduler.js`'s `startAbsenteeScheduler()` (called once from `server.js` at startup) is a `setInterval` that ticks every 60s, lists every `approved`+active tenant from `public.onec_tenants`, and for each one whose `whatsapp_absentee` config is `daily`/`weekly`: checks the current server time against `absentee_schedule_time` (and `absentee_schedule_day` for weekly), and — if it matches and `absentee_last_sent_date` isn't already today — calls `sendAbsenteeDigest` and stamps `absentee_last_sent_date`. No catch-up logic for a missed tick (e.g. the server was down at the scheduled minute) and no per-tenant timezone (every tenant shares the server's clock) — acceptable simplifications for a testing-phase/demo feature, not guarantees this makes for a production paging system.

## Permissions

`broadcast.view` + `broadcast.manage` (admin/staff/instructor), `broadcast.approve` (admin/staff — an instructor's recording needs a staff-side sign-off), `broadcast.configure` (**admin only**, like `users.manage_passwords`). Learners/guardians get nothing — they're recipients, not senders.

## Phone number resolution

For SMS/voicemail (`resolveRecipients`, audience-picker driven): recipients resolve to `onec_users` rows, then a phone is looked up per role: `onec_instructors.phone` → `onec_guardians.phone` → `onec_learners.meta->>'phone'` (first match wins). Users with no phone anywhere are counted in `skipped_no_phone` rather than failing the whole send. Plain admin/staff accounts have no phone column at all, so they're only reachable if they also have one of those role rows. `resolveRecipients` also filters out any user with `onec_users.broadcast_opt_out = true` — a self-serve toggle on the Profile page (see `server/modules/profile`) — before phone lookup even runs, so an opted-out user never receives SMS/voicemail regardless of audience selection.

For `whatsapp_absentee` there's no audience picker — `sendAbsenteeDigest` resolves straight from today's absent learners to their linked guardians (`onec_learner_guardian_map`), filtered to `whatsapp_opt_in = true` with a phone on file.

## Diagnosing a failed send

`dispatchOne` (`server/lib/broadcastDispatch.js`) captures the actual reason a send failed — either `"HTTP <status>: <response body>"` for a non-2xx from the provider (this is where a Twilio-style JSON error body ends up), or a thrown error's message for a network-level failure (DNS, connection refused, the 10s timeout). `dispatchToAll` surfaces the most recent one as `lastError`; every send endpoint (`sendSms`, `sendWhatsapp`, `sendVoicemail`, `sendAbsenteeAlertsNow`/the scheduler) includes it as `send_result.last_error` whenever `failed > 0`, both in the API response and the stored `onec_broadcasts` row — visible directly in each tab's history table and the post-send summary, no server log access needed.

## Known limitations (v1, intentional)

- Sends are synchronous within the request — fine at school scale, would need a queue for very large tenants.
- No per-recipient delivery log — only aggregate `{sent, failed, skipped_no_phone}` per broadcast (`{sent, failed}` for `whatsapp_absentee`, since it's always exactly one dispatch call per digest).
- The 30s cap is enforced client-side by the recorder and server-side only via the submitted `duration_seconds` (no server-side audio decoding to verify).
- The absentee scheduler shares one server clock across every tenant (no per-tenant timezone) and has no catch-up for a missed tick — see above.
