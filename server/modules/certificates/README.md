# Certificates Module (Phase 9)

**Purpose**: Issue and look up official certificates (transfer certificate, conduct certificate, degree) for a learner.

**API Endpoints**:
- `GET /api/v1/certificates` — list, optionally `?learner_id=`
- `GET /api/v1/certificates/:id`
- `GET /api/v1/certificates/:id/pdf` — renders the certificate as a downloadable PDF (via `pdfkit`): org name, certificate type/no/issue date, learner name + registry no, the certificate's arbitrary `data` fields, and a signature line. Same access rules and row-level scoping as `GET /:id` — this is just a different representation of the same record.
- `POST /api/v1/certificates` — issue a certificate. `certificate_no` is caller-provided (no auto-generation strategy defined by spec) and must be unique; `issued_by` is always the authenticated user, never accepted from the request body.

**No update or delete endpoints, intentionally.** Certificates are immutable official records once issued — the correct fix for an error is issuing a corrected one, not silently editing history.

**Permissions**: Requires authentication AND the `certificates` module must be enabled in the tenant's `active_modules` (school/college; not enabled for kindergarten in v1), AND `certificates.view` (GET) or `certificates.issue` (POST), checked against `onec_role_permissions`.

**Row-level scoping**: a `learner`- or `guardian`-role caller only ever sees their own (or their linked children's) certificates, via `lib/rowScope.js` — `GET /` forces the `learner_id` filter regardless of `?learner_id=`, and `GET /:id`/`GET /:id/pdf` return `404` (not `403`, to avoid confirming a certificate id belongs to someone else) for any certificate outside that scope. Other roles are unscoped.

**Business rules**: Issuance is logged via `logAudit` (action `certificate.issued`) per spec §11's explicit call-out of certificate issuance as a sensitive action requiring an audit trail.
