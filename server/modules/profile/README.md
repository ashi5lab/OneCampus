# Profile Module

**Purpose**: Self-service profile picture upload/removal, backed by Cloudinary. Separate from `learners`/`instructors`/`guardians` on purpose — a profile picture belongs to `onec_users` (every role has one), not any single role-specific table.

**API Endpoints**:
- `POST /api/v1/profile/picture` — multipart/form-data, field name `picture`. Uploads to Cloudinary and sets `onec_users.profile_picture_url` for the **caller's own** user row. Max 5MB, JPEG/PNG/WEBP/GIF only (enforced by `multer`'s `fileFilter`/`limits`, returns 400 on rejection). Returns 503 if Cloudinary env vars aren't set for this deployment.
- `DELETE /api/v1/profile/picture` — clears the caller's `profile_picture_url` (does not delete the asset from Cloudinary itself — out of scope for v1).

**Permissions**: just `auth` (any authenticated user) — there's no permission check beyond being logged in, since this only ever touches the caller's own row. No "set someone else's picture" path exists yet.

**Business Rules**:
- `server/lib/cloudinary.js` wraps the Cloudinary Node SDK. **This Cloudinary account/cloud is shared across multiple unrelated apps** (per the user) — every upload goes under `onecampus/<tenant_schema>/profile-pictures/user-<userId>`, so assets from this app are always identifiable and can't collide with another project's.
- Configured via `CLOUDINARY_CLOUD_NAME`/`CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET` env vars (see `server/config/env.js`) — **never commit real values**, set them directly in the deployment platform (Railway dashboard for prod, `server/.env` — gitignored — for local dev). `lib/cloudinary.js`'s `isConfigured` is `false` (and uploads 503) if any are missing, rather than crashing at startup.
- The resulting `profile_picture_url` is surfaced through `learners`/`instructors`' `getProfile` endpoints (and guardians, via the learner profile's guardian list) — see those modules.
