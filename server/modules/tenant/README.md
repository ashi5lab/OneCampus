# Tenant Module

**Purpose**: Expose the current tenant's public config (org name/type, active modules, branding, vocabulary overrides) so the frontend can bootstrap before a user logs in.

**API Endpoints**:
- `GET /api/v1/tenant/config` — no auth required; relies on `tenantResolver` having already resolved the tenant from the request's Host/`x-tenant-domain` header.

**Permissions**: None — this endpoint deliberately excludes anything internal (schema name, tenant id, etc.), so it's safe to expose publicly.
