# Super Admin Feature

**Purpose**: Platform-level tenant management — approve/decline self-registered tenants, edit contact details, disable, or delete a tenant. Separate from the tenant-facing app entirely: different auth (`SuperAdminAuthContext`, `lib/superAdminApiClient.js`, `POST /api/v1/platform/super-admin/login`), no tenant header, no permissions system (single flat operator role today).

**Routes**: `/super-admin/login` and `/super-admin` (list + actions), both wrapped in one `SuperAdminAuthProvider` instance in `App.jsx` (a route-level layout route, not two separate providers) so logging in on the login page is immediately reflected on the dashboard without an extra round trip.

**Key files**:
- `services/superAdminApi.js` / `hooks/useSuperAdminTenants.js` — React Query wrappers over `GET/PATCH/DELETE /api/v1/platform/tenants*`.
- `components/SuperAdminDashboardPage.jsx` — status-filtered tenant list (Pending/Approved/Declined/All tabs), mobile-first card layout (no table — this list is short and card actions read better on a phone than a wide table would).
- `components/TenantEditModal.jsx` — edits `org_name`/contact fields/`is_active` on an approved tenant. Doesn't touch `org_type` or `domain` — changing either post-provisioning would desync from the already-created schema/module config, out of scope for this pass.

**Business rules**:
- **Approve** is irreversible in effect (creates a real Postgres schema + admin user) — the UI confirms before calling it.
- **Decline** only works on `status: 'pending'` rows (enforced server-side too) — takes an optional reason, shown back to the tenant if/when a status-check UI reads it.
- **Delete** on an already-approved (provisioned) tenant drops its schema and every row in it — the confirmation copy says so explicitly, this cannot be recovered from the UI.
- This is intentionally the *minimum* viable admin surface per the "we'll build this out more later" scope — no audit log viewer (writes still happen, see `server/lib/platformAudit.js`), no super admin user management, no bulk actions.
