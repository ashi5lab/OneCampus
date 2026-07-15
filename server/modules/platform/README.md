# Platform Module

**Purpose**: Self-serve tenant registration and super admin tenant management. Not tenant-scoped — these routes operate directly on `public.onec_tenants` / `public.onec_super_admins`, mounted in `server.js` *before* `tenantResolver`/`tenantDb` so they work with no tenant resolved yet.

**API Endpoints**:
- `POST /api/v1/platform/tenants/register` — public. Body: `{ org_name, org_type, slug, contact_name, contact_phone, contact_email, admin_username, admin_password }`. Creates a `public.onec_tenants` row with `status: 'pending'` — no schema is created yet, just the row and a reserved `domain` (`${slug}.${TENANT_BASE_DOMAIN}`, see `config/env.js`). `admin_password` is hashed and held on the row (`admin_password_hash`) until approval.
- `GET /api/v1/platform/tenants/status?domain=...` — public. Lets a just-registered tenant poll their review status without logging in anywhere (there's nowhere to log in to yet).
- `POST /api/v1/platform/super-admin/login` — public, rate-limited. Bootstrap credential is `admin`/`admin` (see `server/scripts/seedSuperAdmin.js`) — change it once the admin UI grows password management. Returns a Bearer JWT (`scope: 'super_admin'`, `SUPER_ADMIN_TOKEN_TTL`, default `12h`). No refresh-token flow yet — deliberate simplification (see `server/modules/auth` for the pattern to extend to when this admin surface grows).
- `GET /api/v1/platform/super-admin/me` — super-admin-only. Confirms the token is valid and returns the caller's identity.
- `GET /api/v1/platform/tenants?status=pending|approved|declined` — super-admin-only. Lists tenant registrations, optionally filtered by status.
- `PATCH /api/v1/platform/tenants/:id/approve` — super-admin-only. Must be `status: 'pending'`. Creates the tenant's Postgres schema (`provisionSchema()` in `server/scripts/provisionTenant.js` — shared with the CLI provisioning script), runs the DDL, seeds default role permissions, and creates the tenant's first `admin` user from the credentials submitted at registration. All in one transaction.
- `PATCH /api/v1/platform/tenants/:id/decline` — super-admin-only. Body: `{ reason? }`. Must be `status: 'pending'`.
- `PATCH /api/v1/platform/tenants/:id` — super-admin-only. Edits `org_name`/`contact_name`/`contact_email`/`contact_phone`/`is_active`.
- `DELETE /api/v1/platform/tenants/:id` — super-admin-only. Deletes the registration row; if it was already provisioned, also `DROP SCHEMA ... CASCADE`s the tenant's schema. Irreversible.

**Permissions**: super admin routes use `middleware/requireSuperAdmin.js`, not the tenant `permissions` system — there's only one class of platform operator today, no role granularity. `requireSuperAdmin` checks `scope: 'super_admin'` on the JWT; the regular tenant `auth` middleware separately checks `decoded.tenant === req.tenantConfig.domain`, so tokens from one system are never valid against the other (a super admin token has no `tenant` claim, a tenant token has no `scope` claim).

**Business Rules**:
- `tenantResolver` only resolves tenants with `status = 'approved'` (and `is_active = true`) — a pending or declined tenant's domain 404s on every tenant-scoped route, same as an unknown domain, until approved.
- `server/lib/moduleDefaults.js` maps `org_type` → default `active_modules`/schema name derivation, shared between this module and the CLI `provisionTenant.js` so they can't drift.
- Platform-level actions (approve/decline/update/delete) are logged to `public.onec_platform_audit_logs` via `server/lib/platformAudit.js` — the cross-tenant counterpart to `server/lib/audit.js`.
- Registration and super admin login are both rate-limited by IP (`server/middleware/rateLimiters.js`).

**Known limitations** (intentional, per the "build the admin page more later" scope):
- No super admin refresh-token rotation — a single `12h` JWT, no logout/revocation endpoint.
- No multi-super-admin roles/permissions — anyone in `onec_super_admins` can do everything.
- No email/SMS notification to a tenant when approved/declined — the frontend's "check status" flow requires the tenant to come back and poll.
