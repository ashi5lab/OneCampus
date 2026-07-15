# Certificates Feature (Frontend)

**Purpose**: List issued certificates and issue new ones (transfer certificate, conduct, degree) for a learner.

**API Endpoints used**: `GET /api/v1/certificates`, `POST /api/v1/certificates`.

**Permissions**: server-enforced via `certificates.view`/`certificates.issue`, gated by the `certificates` module toggle (school/college tenants; not kindergarten) — see `server/modules/certificates/README.md`. Not shown in the nav for tenants without the module (mirrors the Attendance/Exams nav pattern).
