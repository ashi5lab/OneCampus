# Substitutes Module

**Purpose**: Closes the gap between `server/modules/leave` and `server/modules/timetable` — approving an instructor's leave previously had no effect on their timetable at all, leaving every period they were scheduled to teach silently uncovered. This surfaces exactly which periods need a substitute for an approved instructor leave, and lets an admin/staff member assign one.

**API Endpoints**:
- `GET /api/v1/substitutes/coverage/:leaveRequestId` — every `(allocation, date)` pair within the leave's date range that falls on a day that instructor is scheduled, with whichever of those already has a substitute assigned. 404s if the leave doesn't exist, isn't an instructor's, or isn't `approved` yet (there's nothing to cover until it's actually granted). Requires `substitutes.view`.
- `POST /api/v1/substitutes` — `{ leave_request_id, allocation_id, date, substitute_instructor_id }`, upserts on `(allocation_id, date)` (re-assigning the same period+date replaces the substitute rather than erroring). Requires `substitutes.manage`.
- `DELETE /api/v1/substitutes/:id` — remove an assignment (the period reverts to "needs covering"). Requires `substitutes.manage`.

**Permissions**: `substitutes.view` (admin/staff/instructor — an instructor can see who's covering their own periods, or what they're covering for someone else), `substitutes.manage` (admin/staff only — mirrors `leave.approve`'s default, since assigning a substitute is the natural next step after approving a leave).

**Business rules**:
- "Which periods need covering" is computed on read (`server/lib/substituteCoverage.js`), not stored — only an actual assignment persists in `onec_substitute_assignments`. This mirrors the calendar module's recurrence-expanded-on-read pattern: the source of truth is the instructor's `onec_allocations` rows + the leave's date range, not a materialized list that could drift out of sync if either changes.
- A leave's coverage is capped at 60 days of expansion — long enough for any realistic leave request, short enough to guard against a pathological date range doing unbounded work.
- The substitute instructor can't be the same instructor who's on leave for that period (rejected with a 400) — beyond that, **there's no conflict check against the substitute's own schedule** (they could already be teaching another class at that exact time). Assigning a substitute is a manual judgment call by whoever's doing it; this is a known v1 gap, not an oversight, and no different from a human doing this over email.

**Known limitations (v1)**:
- No notification to the assigned substitute (e.g. via the broadcast/WhatsApp modules) that they've been assigned — they'd need to check the coverage view themselves for now.
- No bulk "assign this substitute to every uncovered period for this leave" action — each period is assigned individually.
