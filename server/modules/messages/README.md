# Messages Module

**Purpose**: Simple internal direct messaging between two users in the same tenant. Was already listed in `server/lib/moduleDefaults.js`'s default `active_modules` for kindergarten/school tenants (`'messaging'`) since long before this module existed — that config entry was a stub with nothing behind it until now.

**API Endpoints**:
- `GET /api/v1/messages/inbox` — messages the caller received, newest first, joined with the sender's username/role.
- `GET /api/v1/messages/sent` — messages the caller sent, joined with the recipient's username/role.
- `GET /api/v1/messages/unread-count` — `{ count }` of unread inbox messages, for a sidebar badge.
- `GET /api/v1/messages/recipients` — every other active user in the tenant (`id, username, role`), for the compose recipient picker.
- `POST /api/v1/messages` — `{ recipient_id, subject?, body }`. Sender is always the caller (`req.user.userId`), never a request field.
- `PATCH /api/v1/messages/:id/read` — marks a message read. Scoped to `recipient_id = caller` in the query itself, so there's no separate ownership check to get wrong.

**Permissions**: `messages.view` (GET routes) / `messages.send` (POST) — granted to **every role by default** (`server/lib/permissions.js`), unlike the roster-style `.view`/`.manage` split elsewhere. There's no row-level scoping concern here the way there is for attendance/scores/certificates: a message's `sender_id`/`recipient_id` already *is* the caller, by construction — nothing to additionally filter by.

**Business Rules**:
- Gated by the `messaging` module toggle (`moduleGuard('messaging')`) — a tenant without `messaging` in `active_modules` 404s on all of these routes. Per `moduleDefaults.js`, `kindergarten` and `school` tenants get it by default; `college` does not (pre-existing config from before this module was built, not a decision made here).
- No group/broadcast messaging, no attachments, no read-receipts beyond the single `is_read` flag — direct one-to-one text messages only, v1.
- No recipient-scoping by role (a learner can message an admin directly, etc.) — see `listRecipients`' comment if this needs narrowing later.
