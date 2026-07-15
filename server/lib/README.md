# Shared Server Library

Cross-cutting helpers used by multiple modules, not tied to any single feature.

- **`permissions.js`** — Phase 7 role/permission system: `onec_role_permissions` seed data (`DEFAULT_ROLE_PERMISSIONS`), `seedDefaultPermissions(client)`, and `can`/`cannot`/`hasPermission(req, permission)`. Paired with `server/middleware/permissionGuard.js`.
- **`audit.js`** — `logAudit(req, action, details)`: fire-and-forget insert into `onec_audit_logs` (spec Part 11). Never throws — a logging failure must not fail the request it's logging. Currently called from: `permissionGuard.js` (every `403`, action `permission.denied`), `evaluations/controller.js` `recordScore` (`evaluation.score_recorded`), `learners/controller.js` and `instructors/controller.js` `remove` (`*.deleted`). Add more call sites as new sensitive actions (certificate issuance, role changes) get built.
