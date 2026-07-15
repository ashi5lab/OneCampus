# Library Module

**Purpose**: A book catalog with copy-count tracking, plus loan issue/return. Not gated by a module toggle — like Notices, treated as a core feature every institution type can use.

**API Endpoints**:
- `GET /api/v1/library/books` — the catalog.
- `POST /api/v1/library/books` — `{ title, author?, isbn?, category?, total_copies? }`. `available_copies` starts equal to `total_copies`.
- `PUT /api/v1/library/books/:id` — editing `total_copies` adjusts `available_copies` **by the delta**, not an overwrite, so it doesn't clobber copies currently out on loan (e.g. 5 total/2 available, edited to 6 total → 3 available, not reset to 6).
- `DELETE /api/v1/library/books/:id`.
- `GET /api/v1/library/borrowers` — every active user in the tenant (manager-only), for the "issue to" picker.
- `GET /api/v1/library/loans` — `admin`/`staff` see every loan; everyone else sees only their own (`borrower_id = caller`).
- `POST /api/v1/library/loans` — `{ book_id, borrower_id, due_date }`. Decrements `available_copies` inside the same transaction as creating the loan row (`SELECT ... FOR UPDATE` on the book row first), rejecting with 400 if no copies are available.
- `PATCH /api/v1/library/loans/:id/return` — sets `returned_date`, increments `available_copies` back. Rejects (400) a loan that's already returned.

**Permissions**: `library.view` (everyone, by default) / `library.manage` (admin/staff only, by default) — same split as `notices.view`/`notices.manage`.

**Business Rules**:
- `borrower_id` references `onec_users`, not `onec_learners` — staff and instructors can borrow books too, not just students.
- No holds/reservations, no fines/overdue tracking beyond the raw `due_date` column, no barcode scanning — a straightforward catalog + issue/return flow, v1.
