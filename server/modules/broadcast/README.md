# Broadcast Module (SMS + Voicemail + WhatsApp Absentee Alerts)

**Purpose**: Outbound messaging with a per-tenant, per-channel HTTP API configuration so a real provider can be wired in later **without any code change** — the tenant admin describes the provider's HTTP call in the Configuration panel (shared across every channel, see `client/src/features/broadcast/components/ChannelConfigModal.jsx`), and every send renders that description per recipient. `server/lib/broadcastDispatch.js` is the one HTTP-call executor every channel goes through (`{{name}}` substitution, POST/GET, 10s timeout).

Two channels are manually composed and sent by an admin (SMS, Voicemail); `whatsapp_absentee` is automatic-only — see `server/lib/whatsappNotify.js` — because WhatsApp requires a pre-approved message *template* for anything business-initiated, not a freeform string, so there's no "type a message" UI for it.

## Configuration model (`onec_broadcast_configs`, one row per channel)

- `api_url` + `http_method` (`POST` or `GET`).
- `headers` — string map, e.g. `{"Authorization": "Bearer {{apikey}}"}`.
- `payload_template` — string map used as the JSON body when method is POST, e.g. `{"to": "{{phone}}", "text": "{{message}}"}`.
- `params_template` — string map used as URL query params when method is GET.
- `variables` — static string map (`{"apikey": "..."}`) substituted into all templates via `{{name}}` placeholders.
- **Runtime variables** (always available, take precedence over static ones): `{{phone}}` (per recipient) plus, per channel — SMS: `{{message}}`; voicemail: `{{voice_url}}`; `whatsapp_absentee`: `{{learner_name}}`, `{{cohort_name}}`, `{{date}}` (no `{{message}}` — the message text itself lives in the pre-approved WhatsApp template, referenced by name inside `payload_template`, e.g. `{"template": {"name": "absentee_alert", ...}}`).
- `is_active` — sends fail with a clear 400 until the channel is configured *and* activated.

## Endpoints

- `GET /api/v1/broadcast/config` / `PUT /api/v1/broadcast/config/:channel` — **`broadcast.configure` (admin-only by default)**, since the config holds provider credentials. `:channel` is any of `sms` | `voicemail` | `whatsapp_absentee`.
- `GET /api/v1/broadcast?channel=sms|voicemail|whatsapp_absentee` — history (`broadcast.view`).
- `GET /api/v1/broadcast/users` — audience picker (`broadcast.manage`).
- `POST /api/v1/broadcast/sms` — `{ message, audience_type: 'all'|'cohort'|'users', audience_ids }`. Resolves recipients, dispatches one API call per recipient (sequential, 10s timeout each), records `{sent, failed, skipped_no_phone}`.
- `POST /api/v1/broadcast/voicemails` — multipart (`voice` field, audio mimetypes, 3MB cap) + `duration_seconds` (server-validated ≤ 30). Uploads to Cloudinary (`onecampus/<tenant_schema>/voicemails/`, `resource_type: 'video'` — Cloudinary's type for all audio) and creates a `pending_approval` row.
- `PUT /api/v1/broadcast/voicemails/:id/approve` / `.../reject` — `broadcast.approve` (admin/staff). Reject takes an optional `{ reason }`.
- `POST /api/v1/broadcast/voicemails/:id/send` — `broadcast.manage`; only `approved` (or previously `sent`) voicemails can be shared, to the same audience shapes as SMS. A voicemail can be re-shared to a different audience; `send_result`/`sent_at` reflect the latest dispatch.
- No manual send endpoint for `whatsapp_absentee` — see `server/lib/whatsappNotify.js`'s `notifyAbsentee`, called from `server/modules/attendance/controller.js`'s `mark()` on a genuine present/late/excused → absent transition (not on every edit of an already-absent record). Fires after the attendance-marking response is sent, so a slow/unreachable provider never delays that response; every failure is caught internally and logged, never thrown. Only guardians with `onec_guardians.whatsapp_opt_in = true` and a phone on file are notified — see the opt-in checkbox on the Guardians page.

## Permissions

`broadcast.view` + `broadcast.manage` (admin/staff/instructor), `broadcast.approve` (admin/staff — an instructor's recording needs a staff-side sign-off), `broadcast.configure` (**admin only**, like `users.manage_passwords`). Learners/guardians get nothing — they're recipients, not senders.

## Phone number resolution

For SMS/voicemail (`resolveRecipients`, audience-picker driven): recipients resolve to `onec_users` rows, then a phone is looked up per role: `onec_instructors.phone` → `onec_guardians.phone` → `onec_learners.meta->>'phone'` (first match wins). Users with no phone anywhere are counted in `skipped_no_phone` rather than failing the whole send. Plain admin/staff accounts have no phone column at all, so they're only reachable if they also have one of those role rows.

For `whatsapp_absentee` there's no audience picker — `notifyAbsentee` resolves straight from the one learner just marked absent to their linked guardians (`onec_learner_guardian_map`), filtered to `whatsapp_opt_in = true` with a phone on file.

## Known limitations (v1, intentional)

- Sends are synchronous within the request — fine at school scale, would need a queue for very large tenants. (`whatsapp_absentee` is the exception — it fires after the response is already sent, since it's only ever a couple of guardians per learner.)
- No per-recipient delivery log — only aggregate `{sent, failed, skipped_no_phone}` per broadcast (`{sent, failed}` for `whatsapp_absentee`, since it has no unopted-in-guardian-with-no-phone concept to report separately).
- The 30s cap is enforced client-side by the recorder and server-side only via the submitted `duration_seconds` (no server-side audio decoding to verify).
- Only one automatic WhatsApp trigger exists so far (absentee alerts). The same pattern — a new channel name in `CHANNELS`, a small `libNotify.js`-style lookup, one call site — extends cleanly to more (leave decision alerts, general notices, fee reminders, ...) as separate follow-ups.
