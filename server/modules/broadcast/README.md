# Broadcast Module (SMS + Voicemail)

**Purpose**: Outbound bulk messaging over two channels — SMS and 30-second voicemails — with a per-tenant, per-channel HTTP API configuration so a real provider can be wired in later **without any code change**. No provider is integrated yet: the tenant admin describes the provider's HTTP call in the Configuration panel, and every send renders that description per recipient.

## Configuration model (`onec_broadcast_configs`, one row per channel)

- `api_url` + `http_method` (`POST` or `GET`).
- `headers` — string map, e.g. `{"Authorization": "Bearer {{apikey}}"}`.
- `payload_template` — string map used as the JSON body when method is POST, e.g. `{"to": "{{phone}}", "text": "{{message}}"}`.
- `params_template` — string map used as URL query params when method is GET.
- `variables` — static string map (`{"apikey": "..."}`) substituted into all templates via `{{name}}` placeholders.
- **Runtime variables** (always available, take precedence over static ones): `{{phone}}` (per recipient), `{{message}}` (SMS body), `{{voice_url}}` (approved recording's URL, voicemail sends only).
- `is_active` — sends fail with a clear 400 until the channel is configured *and* activated.

## Endpoints

- `GET /api/v1/broadcast/config` / `PUT /api/v1/broadcast/config/:channel` — **`broadcast.configure` (admin-only by default)**, since the config holds provider credentials.
- `GET /api/v1/broadcast?channel=sms|voicemail` — history (`broadcast.view`).
- `GET /api/v1/broadcast/users` — audience picker (`broadcast.manage`).
- `POST /api/v1/broadcast/sms` — `{ message, audience_type: 'all'|'cohort'|'users', audience_ids }`. Resolves recipients, dispatches one API call per recipient (sequential, 10s timeout each), records `{sent, failed, skipped_no_phone}`.
- `POST /api/v1/broadcast/voicemails` — multipart (`voice` field, audio mimetypes, 3MB cap) + `duration_seconds` (server-validated ≤ 30). Uploads to Cloudinary (`onecampus/<tenant_schema>/voicemails/`, `resource_type: 'video'` — Cloudinary's type for all audio) and creates a `pending_approval` row.
- `PUT /api/v1/broadcast/voicemails/:id/approve` / `.../reject` — `broadcast.approve` (admin/staff). Reject takes an optional `{ reason }`.
- `POST /api/v1/broadcast/voicemails/:id/send` — `broadcast.manage`; only `approved` (or previously `sent`) voicemails can be shared, to the same audience shapes as SMS. A voicemail can be re-shared to a different audience; `send_result`/`sent_at` reflect the latest dispatch.

## Permissions

`broadcast.view` + `broadcast.manage` (admin/staff/instructor), `broadcast.approve` (admin/staff — an instructor's recording needs a staff-side sign-off), `broadcast.configure` (**admin only**, like `users.manage_passwords`). Learners/guardians get nothing — they're recipients, not senders.

## Phone number resolution

Recipients resolve to `onec_users` rows, then a phone is looked up per role: `onec_instructors.phone` → `onec_guardians.phone` → `onec_learners.meta->>'phone'` (first match wins). Users with no phone anywhere are counted in `skipped_no_phone` rather than failing the whole send. Plain admin/staff accounts have no phone column at all, so they're only reachable if they also have one of those role rows.

## Known limitations (v1, intentional)

- Sends are synchronous within the request — fine at school scale, would need a queue for very large tenants.
- No per-recipient delivery log — only aggregate `{sent, failed, skipped_no_phone}` per broadcast.
- The 30s cap is enforced client-side by the recorder and server-side only via the submitted `duration_seconds` (no server-side audio decoding to verify).
