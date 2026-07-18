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
- `PATCH /api/v1/library/loans/:id/waive-fine` — `{ waived_amount, reason? }`. Sets the loan's total waived amount (an overwrite, not additive — see Business Rules).

**Permissions**: `library.view` (everyone, by default) / `library.manage` (admin/staff only, by default) — same split as `notices.view`/`notices.manage`. Waiving a fine reuses `library.manage`, not a separate permission.

**Business Rules**:
- `borrower_id` references `onec_users`, not `onec_learners` — staff and instructors can borrow books too, not just students.
- No holds/reservations, no barcode scanning — a straightforward catalog + issue/return flow, v1.
- **Overdue fines** (`server/lib/libraryFines.js`): a fixed rate per calendar day overdue, not tenant-configurable in v1, and currency-agnostic — nothing else in this app assumes a currency, so the number is meant to be read in whatever unit the tenant already uses. `GET /loans` includes computed `days_overdue`, `fine_amount` (raw), `fine_waived_amount`, and `net_fine_amount` (= `fine_amount - fine_waived_amount`, floored at 0) on every row — computed on read from `due_date`/`returned_date`, never stored, so it's always correct without a background job. Once `returned_date` is set the fine is naturally frozen at that date forever after (the calculation stops using "today" as the reference point).
- **This is explicitly not a fees/billing/payments feature** — there's no invoicing, no payment collection, no "mark as paid." It only calculates what's owed and lets `library.manage` waive some or all of it (`PATCH .../waive-fine`); actually collecting the money happens outside the app. `waived_amount` is a running total set on the loan, not additive — calling the endpoint again replaces the prior waiver rather than stacking on top of it. A partial waiver on a still-outstanding loan doesn't cap the fine at zero forever — it keeps accruing against today, just netted against whatever's already been waived.
