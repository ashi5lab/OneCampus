# Certificates Feature (Frontend)

**Purpose**: List issued certificates, issue new ones (transfer certificate, conduct, degree) for a learner, and download any certificate as a PDF.

**API Endpoints used**: `GET /api/v1/certificates`, `POST /api/v1/certificates`, `GET /api/v1/certificates/:id/pdf`. The PDF download goes through `lib/apiClient.js`'s `downloadFile` (not the regular JSON `get`/`post` helpers) since the response is binary — it fetches as a Blob and triggers a browser download via a temporary object URL, reusing the same auth-header/401-refresh-retry logic as the rest of `apiClient`.

**Permissions**: server-enforced via `certificates.view`/`certificates.issue`, gated by the `certificates` module toggle (school/college tenants; not kindergarten) — see `server/modules/certificates/README.md`. Not shown in the nav for tenants without the module (mirrors the Attendance/Exams nav pattern).
