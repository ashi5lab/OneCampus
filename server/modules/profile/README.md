# Profile Module

**Purpose**: Every user's own account surface — profile picture (Cloudinary), own account details, own password change — plus the admin-side "reset any user's password". Separate from `learners`/`instructors`/`guardians` on purpose — all of this belongs to `onec_users` (every role has one), not any single role-specific table.

**API Endpoints**:
- `GET /api/v1/profile/me` — the caller's own `onec_users` row (`id`, `username`, `email`, `role`, `profile_picture_url`). Deliberately separate from `GET /auth/me` (session/permissions, called on every app load) so profile fields never bloat the auth hot path.
- `POST /api/v1/profile/picture` — multipart/form-data, field name `picture`. Uploads to Cloudinary and sets `onec_users.profile_picture_url` for the **caller's own** user row. Max 5MB, JPEG/PNG/WEBP/GIF only (enforced by `multer`'s `fileFilter`/`limits`, returns 400 on rejection). Returns 503 if Cloudinary env vars aren't set for this deployment.
- `DELETE /api/v1/profile/picture` — clears the caller's `profile_picture_url` (does not delete the asset from Cloudinary itself — out of scope for v1).
- `PUT /api/v1/profile/password` — `{ current_password, new_password }`. Verifies the current password with bcrypt before setting the new one (min 8 chars); audit-logged as `user.password_changed` with `by: 'self'`.
- `GET /api/v1/profile/users` — **`users.manage_passwords` only**: every user in the tenant (including inactive, so a locked-out account can be fixed before re-enabling) for the admin reset form's picker.
- `PUT /api/v1/profile/users/:userId/password` — **`users.manage_passwords` only**: `{ new_password }`, no current-password check (that's the point — the user forgot theirs). Audit-logged with both the target user and the acting admin's id.
- `GET /api/v1/profile/notification-preferences` — `{ broadcast_opt_out, whatsapp_opt_in }` for the caller's own row. `whatsapp_opt_in` is `null` for a caller with no `onec_guardians` row (every role but guardian) — the frontend hides that toggle when it's `null`.
- `PUT /api/v1/profile/notification-preferences` — `{ broadcast_opt_out?, whatsapp_opt_in? }`, both optional/independent. `broadcast_opt_out` always updates the caller's `onec_users` row. `whatsapp_opt_in` updates `onec_guardians.whatsapp_opt_in` for a caller who has a guardian row (a no-op, not an error, for one who doesn't). Audit-logged as `user.notification_preferences_updated`.

**Permissions**: the self-service routes need just `auth` (any authenticated user) since they only ever touch the caller's own row. The two `/users` routes are gated by `users.manage_passwords`, granted **only to `admin`** by default (deliberately not staff — a tenant can grant it to staff by inserting the `onec_role_permissions` row).

**Notification preferences business rules**:
- `broadcast_opt_out` (on `onec_users`, default `false`) gates `server/modules/broadcast`'s SMS and voicemail sends — `resolveRecipients` filters it out at the query level, so an opted-out user is silently excluded the same way a user with no phone on file already was (counted in the broadcast's aggregate numbers, no per-recipient error). It does **not** gate the `whatsapp`/`whatsapp_absentee` channels — the general `whatsapp` broadcast is still test-phase (single test recipient regardless of audience, see `server/modules/broadcast/README.md`) and `whatsapp_absentee` already has its own dedicated opt-in.
- `whatsapp_opt_in` is the same `onec_guardians` column the Guardians roster page (`guardians.manage`) has always been able to edit — this just adds a second, self-serve path to the same column so a guardian doesn't need to ask staff to flip it. Both paths write the same column; there's no conflict or precedence to resolve.

**Business Rules**:
- `server/lib/cloudinary.js` wraps the Cloudinary Node SDK. **This Cloudinary account/cloud is shared across multiple unrelated apps** (per the user) — every upload goes under `onecampus/<tenant_schema>/profile-pictures/user-<userId>`, so assets from this app are always identifiable and can't collide with another project's.
- Configured via `CLOUDINARY_CLOUD_NAME`/`CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET` env vars (see `server/config/env.js`) — **never commit real values**, set them directly in the deployment platform (Railway dashboard for prod, `server/.env` — gitignored — for local dev). `lib/cloudinary.js`'s `isConfigured` is `false` (and uploads 503) if any are missing, rather than crashing at startup.
- The resulting `profile_picture_url` is surfaced through `learners`/`instructors`' `getProfile` endpoints (and guardians, via the learner profile's guardian list) — see those modules.
