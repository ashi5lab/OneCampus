# Tenant Registration Feature

**Purpose**: Public self-serve registration form (`TenantRegisterPage`, routed at `/register`) — a prospective tenant submits their institution details, a phone/email contact, and their proposed admin login, then waits for super admin approval. No auth required to view or submit.

**Key files**:
- `types.js` — zod schema mirroring `server/modules/platform/controller.js`'s `registerSchema`, including a client-only `admin_password_confirm` field (stripped before the API call).
- `services/registrationApi.js` — thin wrapper over `POST /api/v1/platform/tenants/register` and `GET /api/v1/platform/tenants/status`.
- `components/TenantRegisterPage.jsx` — the form; on success shows a confirmation screen with the assigned domain (`${slug}.${TENANT_BASE_DOMAIN}`) instead of navigating away, since there's nowhere to navigate to yet (not approved).

**Business rules**:
- Registration does **not** create a working login — the submitted password is hashed and held on the `onec_tenants` row until a super admin approves it (see `server/modules/platform/controller.js`'s `approveTenant`), at which point the tenant's schema and first `admin` user are created together.
- `slug` becomes the tenant's subdomain (`yourschool` → `yourschool.onecampus.local` by default) — lowercase letters/numbers/hyphens only, enforced both client- and server-side.
- Uses `apiClient` (not a separate client) since `/platform/tenants/register` is a public route mounted before tenant resolution — the tenant/auth headers `apiClient` normally attaches are simply ignored by that route.
