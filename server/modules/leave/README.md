# Leave Module

**Purpose**: self-service leave applications for instructors, staff, and learners — personal/sick leave, with a reason, a date range (whole days) or a single half-day, routed to whoever should approve it.

**Approval routing** (no separate "approver" field is stored — it's resolved at read/write time):
- A **learner**'s leave is approved by their **class teacher** — `onec_cohorts.advisor_id`, set via the Cohorts page (see `server/modules/cohorts`). No new "class teacher" concept was added; `advisor_id` already existed in the schema and was simply unexposed until now.
- Anyone tagged **principal** or **vice_principal** (`meta.designation` on their `onec_instructors`/`onec_staff` row, set via those modules' `setDesignation`) sees and can act on **every** leave request tenant-wide, regardless of applicant type.
- **Admin** always sees and can act on everything.
- A plain instructor with no advisee in a given request, and a plain staff member with no designation, see nothing in the approval queue — only their own history via `/leave/mine`.

**Why no `applicant_id`/`approver_id` foreign keys to onec_instructors/onec_staff/onec_learners**: an applicant is always the caller (`user_id` = their own `onec_users.id`), and which role-specific table that resolves to is recorded once as `applicant_role` rather than three nullable FK columns — `list()` joins all three role tables with `COALESCE` to display a name regardless of which one applies.

**API Endpoints**:
- `POST /api/v1/leave` — apply for leave (`leave.apply`)
- `GET /api/v1/leave/mine` — my own leave history (`leave.view_own`)
- `GET /api/v1/leave` — approval queue, scoped per caller as above (`leave.approve`)
- `PATCH /api/v1/leave/:id/review` — approve/reject a pending request (`leave.approve` + in-controller authorization that this caller may act on *this* request)
- `DELETE /api/v1/leave/:id` — withdraw one's own still-pending request (`leave.apply`)

**Permissions**: `leave.apply` / `leave.view_own` / `leave.approve`, granted by default to instructor/staff/learner (learner gets apply+view_own only — students never approve). `leave.approve` is deliberately coarse-grained (every instructor/staff has it) since the real gate is the per-request authorization check in `canReview()` — this mirrors the row-scoping pattern documented in `lib/permissions.js` (role-level permission + row-level scoping done separately in the controller).
