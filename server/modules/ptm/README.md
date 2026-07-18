# PTM (Parent-Teacher Meeting) Module

**Purpose**: Lets an instructor open bookable meeting slots, and a guardian/learner book one — a digital version of the sign-up sheet posted outside a classroom on PTM day.

**API Endpoints**:
- `GET /api/v1/ptm/slots?date=&instructor_id=` — every slot, with whatever booking (if any) currently occupies it. Requires `ptm.view`.
- `POST /api/v1/ptm/slots` — `{ instructor_id, slot_date, start_time, end_time, cohort_id? }`. `cohort_id` is purely informational (which class this PTM day is for) — booking isn't restricted to that class's families. Allowed for `ptm.manage` (admin/staff, any instructor) or the instructor opening their own availability (self-ownership check, not a separate permission).
- `DELETE /api/v1/ptm/slots/:id` — same access as create. Cascades to any booking on that slot.
- `POST /api/v1/ptm/slots/:id/book` — `{ learner_id, notes? }`. Requires `ptm.book`, row-scoped like every other learner-facing endpoint (`lib/rowScope.js`) — a learner books for themselves, a guardian for a linked child. `409` if the slot's already taken.
- `DELETE /api/v1/ptm/bookings/:id` — cancel. The family who booked it can cancel their own; `ptm.manage` can cancel anyone's.
- `GET /api/v1/ptm/my-learners` — the caller's own bookable learner(s) (self if a learner, linked children if a guardian) — just `id`/`first_name`/`last_name`, enough to populate the booking form's "which child" picker without needing the broader `learners.view` permission. Requires `ptm.book`.

**Permissions**: `ptm.view` (everyone — admin/staff/instructor/learner/guardian), `ptm.manage` (**admin/staff only** — deliberately *not* granted to the `instructor` role; an instructor manages only their own slots via the self-ownership check described above, not tenant-wide `ptm.manage`), `ptm.book` (learner/guardian, plus admin who can book on anyone's behalf).

**Business Rules**:
- One booking per slot (`UNIQUE(slot_id)` on `onec_ptm_bookings`) — a slot is either open or taken, no shared meeting times. A race between two families booking the same slot resolves via that constraint: the losing `INSERT` gets a `409`, not a silent overwrite.
- No overlap validation when an instructor creates slots (unlike `server/modules/timetable`'s `findConflict`) — an instructor creating two overlapping self-slots is left as their own scheduling mistake to notice, not blocked. A worthwhile follow-up if it turns out to matter in practice.
- No notification to the instructor when a family books their slot — they'd need to check the slot list themselves. A natural extension via `server/lib/whatsappNotify.js`'s pattern, not built here.
