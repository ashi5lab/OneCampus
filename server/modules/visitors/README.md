# Visitors Module

**Purpose**: Front-desk/gate-pass log — who's on campus right now and why. A reception/security function, not learner/guardian-facing (unlike most other new modules this phase).

**API Endpoints**:
- `GET /api/v1/visitors?date=&search=` — both filters independently optional; `date` matches the calendar day of `check_in_time`, `search` matches visitor or host name. Requires `visitors.view`.
- `POST /api/v1/visitors` — check a visitor in: `{ visitor_name, visitor_phone?, purpose, host_name, id_proof? }`. `check_in_time` is set server-side to now. Requires `visitors.log`.
- `PUT /api/v1/visitors/:id/checkout` — sets `check_out_time` to now. 409s if already checked out (mirrors PTM's double-booking guard). Requires `visitors.log`.

**Permissions**: `visitors.view`, `visitors.log` — granted to `admin`/`staff` only. Not granted to `instructor`, `learner`, or `guardian`: this is an internal front-desk register, not a personal record any of those roles has a "own" version of.

**Business Rules**:
- `host_name` (whom the visitor is meeting) is a plain free-text field, not a foreign key to `onec_instructors`/`onec_staff` — a visitor's host is just as often a name that doesn't correspond to any login-bearing roster row (e.g. "meeting the Class 5A teacher" scrawled at the gate) as it is someone with an account.
- No delete/edit action — this is meant to stay an append-only register like a physical visitor book, not a correctable log like `discipline` records. A mis-typed entry has no undo; correction would need direct DB access.
- `id_proof` is a single free-text field (e.g. `"Aadhar - 1234"`), not structured type/number columns — kept intentionally loose since schools vary widely in what they record here (driver's license, Aadhar, nothing at all).
