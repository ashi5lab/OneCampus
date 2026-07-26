# Product Requirements Document (PRD)

## OneCampus – Modern School Management Platform
### Version 2.0 (UI/UX Redesign & Product Architecture)

## Vision
OneCampus aims to become the simplest and most enjoyable school management platform with a WhatsApp-like user experience while providing complete academic and administrative capabilities.

## Product Goals
- Extremely simple UI
- Mobile-first experience
- Beautiful modern interface
- Modular architecture
- Feature toggle support
- Permission-based system

## Global UI Components
- **UserSearchSelect**: For any user selection input (student, teacher, guardian, staff), the `<UserSearchSelect />` autocomplete component MUST be used instead of standard HTML dropdowns. Users are fetched via `useAllUsers()` and filtered by `roles`. Supports layout toggles via `showUsername`, `showClass`, and `showRole` boolean props (all default to true).
- **Modals and Alerts**: The use of native browser `window.alert` and `window.confirm` is strictly prohibited. Use the `<ConfirmDialog />` component for any action confirmations and `showToast` for notifications.

## Users
- Student
- Parent / Guardian
- Teacher
- Staff
- Principal
- Vice Principal
- Executive Admin
- Admin

## Core Modules
- Dashboard
- Attendance
- Student Profile
- Exams
- Assignments
- Notices
- Calendar
- Timetable
- Messages
- Activities
- More Apps

Advanced:
- Discipline
- Broadcast
- SMS
- WhatsApp
- Parent Connect
- Analytics
- Reports

## Navigation
Sidebar:
- Dashboard
- Classes
- Activities
- Messages
- Calendar
- More Apps

## Attendance

### Architecture: Exception-Based Model

OneCampus uses an **exception-based attendance architecture** (introduced in v2 commits):

- `onec_attendance` stores **only non-present exceptions**: `absent`, `late`, `excused`
- `onec_cohort_attendance_logs` has **one row per (cohort_id, date)** = attendance was taken for that class on that day
- `is_partial BOOLEAN` on the log row indicates whether only specific students were marked (vs. full cohort)
- **Present** is never explicitly stored. It is computed: `present = total_logged_days - exception_count`
- This model keeps the database compact and makes "present" the default assumption

### Attendance Rate Formula

```
attendanceRate = (marked_30d - exceptions_30d) / marked_30d * 100
```

Where:
- `marked_30d` = COUNT of rows in `onec_cohort_attendance_logs` for the learner's cohort in the last 30 days
- `exceptions_30d` = COUNT of rows in `onec_attendance` for that learner with status IN ('absent', 'late', 'excused') in the last 30 days
- `present_30d` = `marked_30d - exceptions_30d`

### Teacher — Mark Attendance Flow

1. Teacher opens `/app/attendance` — sees the **AttendancePicker** (class list)
2. Each class card shows:
   - **Status badge**: "Marked" (green) or "Pending" (orange) — from `GET /attendance/logs?date=today`
   - **Present count**: `present_count / total_learners` when marked, "--/--" when pending
3. Teacher selects a class → opens **AttendanceRoster** for that cohort + today's date
4. Roster shows all active learners. Default status = present. Teacher marks exceptions.
5. Teacher taps **Save** → `POST /attendance/bulk` with:
   - `cohort_id`, `date`, `is_full_cohort`, `records[]` (only exceptions need to be included)
6. Server upserts `onec_cohort_attendance_logs` and inserts/deletes exception rows accordingly
7. Cache invalidated → class card updates to "Marked"

### Student Search in Attendance

- Teacher can search for a student by name or admission number in the class picker
- Selecting a student navigates directly to that student's class attendance roster, highlighting the student
- URL: `/app/attendance/:cohortId?learner=:learnerId`

### Learner/Guardian — View Attendance (Read-Only)

- Route: `/app/attendance` with `MyAttendanceView`
- Stats section: Attendance Rate (30d), Present (30d), Total Days (30d), Exception Count
- Stats sourced from `GET /reports/dashboard` (exception-model aware)
- Table: Shows only exception records (absent/late/excused) — "present" days are not shown
- Empty state: "No absences or exceptions recorded yet."
- Guardians with multiple linked children see a "Learner" column in the table

### Class Attendance Log States

| State | Condition | Badge Color |
|---|---|---|
| Pending | No row in `onec_cohort_attendance_logs` for this cohort+date | Orange |
| Marked | Row exists, `is_partial = FALSE` | Green |
| Partial | Row exists, `is_partial = TRUE` | Yellow (future) |

### API Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/attendance?page&pageSize` | List attendance records (exception rows only, scoped to user) |
| GET | `/attendance?cohort_id&date&page&pageSize` | Roster for a class on a date |
| GET | `/attendance/logs?date` | Per-cohort Marked/Pending status for the class picker |
| GET | `/attendance/absentee-report?date&cohort_ids` | Absentee report for a day |
| POST | `/attendance` | Mark a single attendance record |
| POST | `/attendance/bulk` | Bulk mark attendance for a cohort (exception-based) |

## Student Profile
Complete portfolio including attendance, exams, assignments, discipline, documents, guardian information and analytics.

#### Student Portfolio
Create a unified Student Portfolio page. This page acts as the student's complete academic history throughout their time in school. The profile should contain:
- Student information
- Admission number
- Parent & Guardian information & Phone number of guardian (mandatory) and student (optional)
- Address
- Academic information
- Class history
- Roll number
- Photo
- Contact details
- Emergency contact
- Optional: Medical information, Transport information
The profile should support printing and exporting (PDF/PPT).

#### Student Dashboard & Layout
Every student profile opens into a dashboard displaying an overview instead of raw records. The layout is designed to be highly responsive and modern:
- **Header Banner:** A premium purple theme banner integrating the avatar, contact buttons (Call/WhatsApp), and core stats (Attendance, CGPA, Rank, Behavior Score).
- **Web Layout:** Two-column grid with a main tabbed content area on the left and a fixed sidebar on the right containing parent/guardian details, academic details, and quick links.
- **Mobile Layout:** Single-column scrollable feed where sidebar cards gracefully stack below the main content.
- **Interactive Tabs:** Pill-shaped navigation for Overview, Academics, Attendance, and Behavior sections.
The dashboard gives a quick understanding of the student's overall progress.

#### Academic Performance
Create a dedicated Academic Performance section that consolidates information from every examination and assignment. Features:
- Subject‑wise performance
- Term‑wise performance
- Monthly performance
- Yearly performance
- Overall average
- Highest marks
- Lowest marks
- Rank (if enabled)
- Teacher remarks
Support grading systems: Marks, Percentage, GPA, Letter Grade.

#### Academic Analytics
Provide visual analytics for academic performance. Include charts such as:
- Subject comparison
- Marks trend
- Grade trend
- Performance over time
- Subject strengths
- Subject weaknesses
- Top performing subjects
- Subjects requiring attention
Analytics should update automatically when marks are published.

#### Attendance Analytics
**Architecture Note**: The system uses an **Exception-Based Attendance Architecture**. Only absences and late marks are stored in the database. "Present" is the default state and is dynamically calculated by subtracting exception records from the total days attendance was logged (`onec_cohort_attendance_logs`).

Attendance should include much more than daily records. Display:
- Overall attendance percentage
- Monthly attendance
- Weekly attendance
- Yearly attendance
- Present vs Absent
- Late arrivals
- Half‑day records
- Leave records
- Attendance streak
- Consecutive absences
Visualizations:
- Monthly heatmap
- Line chart
- Calendar view
- Attendance trend
Generate alerts for:
- Low attendance
- Consecutive absences
- Falling attendance trend

#### Assignment Analytics
Assignments should include:
- Total assignments
- Submitted
- Pending
- Late submissions
- Average score
- Subject‑wise assignment score
- Submission trend
- Teacher feedback
Visual analytics:
- Completion rate
- Monthly submission graph
- Subject comparison

#### Examination Analytics
Provide examination insights. Display:
- Total exams
- Average score
- Highest score
- Subject‑wise averages
- Term comparison
- Year comparison
Visualizations:
- Bar charts
- Line charts
- Radar chart
- Subject comparison

#### Behaviour & Discipline
Create a Behaviour section. Track:
- Positive records
- Negative records
- Achievements
- Warnings
- Teacher remarks
- Counselling sessions
- Rewards
- Recognitions
- Behaviour score
- Discipline score
Each record should include:
- Date
- Teacher
- Category
- Comment
- Action taken
- Follow‑up status
Support attachments where applicable.

#### Student Timeline
Provide a chronological timeline. The timeline should automatically aggregate activities such as:
- Attendance marked
- Exam completed
- Assignment submitted
- Notice received
- Behaviour record
- Discipline entry
- Award received
- PTM attended
- Leave applied
This should provide a complete student history.

#### Progress Card
Generate printable progress card (configured per tenant in app settings). Include:
- School branding
- Student details
- Exam scores
- Subject grades
- Attendance summary
- Behaviour summary
- Teacher remarks
- Principal remarks
- Promotion status
- Signature placeholders
Support PDF export.

#### Report Generation
Allow reports to be generated for:
- Individual student
- Entire class
- Entire grade
- Whole school
Reports should support PDF, Excel, CSV.

#### Role‑Based Views
**Parent View** – read‑only access to:
- Student dashboard
- Attendance analytics
- Academic analytics
- Assignments
- Exam results
- Behaviour & discipline records
- Teacher remarks
- School notices
- Calendar

**Student View** – read‑only access to:
- Their own portfolio
- Academic progress
- Attendance
- Assignments
- Exam results
- Behaviour & discipline records
- Achievements
- Upcoming events
- Teacher remarks

**Teacher View** – permissions to:
- View every student's portfolio
- Add behaviour records
- Add discipline entries
- Publish marks & grades
- View analytics
- Generate reports
- Print progress cards


## Exams
Create, grade, publish and analyze results.

## Assignments
Submission, grading, remarks and publishing.

## Discipline
Positive, Negative and Neutral records with comments and action taken.

## Broadcast
Unified interface for SMS and WhatsApp using configurable providers (Twilio etc.).

## Calendar
Unified calendar containing school events, exams, assignments, attendance and reminders.

## Timetable
Supports class timetable, teacher timetable, conflict detection and override confirmation.

## UX Principles
Every page should support:
- Search
- Filters
- Pagination
- Bulk actions
- Empty states
- Skeleton loading
- Responsive layout

## Implementation Phases

### Phase 1
Design System, Theme Engine, Authentication, Roles & Permissions, Feature Toggles.

### Phase 2
Dashboard, Attendance, Student Profile, Exams, Assignments, Calendar, Notices, Timetable.

### Phase 3
Messaging, Broadcast, WhatsApp, Parent Connect.

### Phase 4
Analytics, Reports and AI features.

## Recommended Stack
Frontend:
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Table
- React Query

Backend:
- Laravel
- PostgreSQL
- Redis

Notifications:
- Firebase
- Twilio

## Identifier Architecture

### User ID as the Universal Display Identifier

OneCampus uses role-specific tables (`onec_learners`, `onec_instructors`, `onec_staff`) with their own auto-increment IDs. The `onec_users` table holds authentication for all users and has its own `id` column (`user_id`).

**Backend**: Role-table IDs (`learner_id`, `instructor_id`, etc.) are kept as-is across all DB tables and server modules. No migration is planned.

**Frontend display rule**: Whenever an ID must be surfaced in the UI (e.g., for quick lookup or debugging), always show **`user_id`** (`onec_users.id`) — never `learner_id` or other role-table IDs. The student profile must display `user_id` as the visible system identifier. This prevents confusion between the two ID spaces and provides a single, consistent reference point across all user types (students, teachers, staff).

---

## Final Goal
Deliver a premium, modern, education-focused platform that feels as intuitive as WhatsApp while remaining scalable for schools of any size.

 # # #   G l o b a l   N o t i f i c a t i o n s 
 -   I m p l e m e n t   a   g l o b a l   r e u s a b l e   T o a s t   c o m p o n e n t   f o r   a l l   s u c c e s s   a n d   f a i l u r e   n o t i f i c a t i o n s   ( r e p l a c i n g   n a t i v e   \  l e r t \ ) .  
 
---

## Exams Module

### Overview
Full exam lifecycle management — create, schedule, grade, and publish results. Built as a structural clone of the Assignments module with exam-specific fields.

### Database Tables
- **`onec_exams`**: id, title, description, module_id (FK → onec_modules), exam_date DATE, eval_type (marks|grades), max_score, passing_marks, pass_grade, instructions, target_type (class|specific_students), status (draft|created|grading_in_progress|completed), publish_marks BOOLEAN, taken_by (FK → onec_users), created_by (FK → onec_users), created_at
- **`onec_exam_cohorts`**: exam_id, cohort_id (supports multi-class targeting)
- **`onec_exam_target_students`**: exam_id, learner_id (for specific_students target_type)
- **`onec_exam_submissions`**: id, exam_id, learner_id, score_obtained, grade_value, feedback, submission_text, status, graded_by, graded_at, submitted_at; UNIQUE(exam_id, learner_id)

### API Endpoints (`/api/v1/exams`)
| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| GET | / | exams.view | List with search/filter/pagination |
| POST | / | exams.manage | Create exam |
| GET | /:id | exams.view | Get exam detail |
| PUT | /:id | exams.manage | Update exam |
| DELETE | /:id | exams.manage | Delete exam |
| POST | /:id/duplicate | exams.manage | Duplicate exam |
| PATCH | /:id/publish | exams.manage | Toggle marks published |
| GET | /:id/valuation | exams.grade | Student list for grading |
| POST | /:id/grade | exams.grade | Upsert grade for student |
| PATCH | /:id/complete | exams.grade | Complete valuation |
| GET | /:id/activity | exams.view | Audit activity log |
| GET | /:id/submissions | exams.view | List all submissions |

### Permissions
- `exams.view` — list and view exams
- `exams.manage` — create, edit, delete, duplicate, publish
- `exams.grade` — access valuation panel and record grades

### Key Fields
- **Exam Name** — the exam title
- **Subject** — linked module (subject)
- **Date** — exam_date (single date, not a due_date range)
- **Taken By** — instructor who conducts the exam; defaults to logged-in user; autocomplete via UserSearchSelect

### Taken By (Assignments + Exams)
Both Assignments and Exams have a `taken_by` field (FK to `onec_users`) that records which instructor takes/conducts it. Defaults to the logged-in user. UI shows an instructor autocomplete (UserSearchSelect with role='instructor').

### Status Flow
draft → created → grading_in_progress → completed

### Client Routes
- `/app/exams` — list page
- `/app/exams/new` — create form
- `/app/exams/:id` — detail (Overview + Students/Grading tabs)
- `/app/exams/:id/edit` — edit form
- `/app/exams/:id/success` — post-create confirmation

### Class Channel Integration
The Class Channel's Exams tab (`ClassExamsTab`) shows exams filtered to that cohort, with columns: Exam Name, Subject, Date, Taken By.

---

## Teacher Profile

### Overview
A teacher-facing profile page (`/app/instructors/:id`) restyled to match the Student Profile page's theme — gradient banner header, stat cards, pill tab bar, and a sidebar — rather than the old flat card layout.

### Layout
- **Banner**: gradient header (`from-[#4b43c4] to-[#3a34a8]`) with avatar, name, staff ID, phone, designation badge (principal/vice principal), and an Edit Profile button (`instructors.manage` only).
- **Stat cards** (in-banner): My Classes (count), Assignments Created, Exams Created, Attendance Marked.
- **Tabs**: Overview, My Classes, Attendance, More.
  - **Overview**: Subjects Taught, a My Classes preview (first 5), Personal Details.
  - **My Classes**: full grid of classes the teacher is a member of, each showing student count and subject(s) taught in that class.
  - **Attendance**: recent attendance the teacher has marked (reused from the previous page).
  - **More**: Download ID Card, Delete Profile (via `ConfirmDialog`, not `window.confirm`).
- **Sidebar**: Contact card, Quick Links (My Classes / Timetable / Assignments / Exams).

### "My Classes" scoping
Deliberately scoped to `onec_instructor_cohorts` (roster membership — the explicit class-teacher allocation), **not** every class the teacher can act on. A teacher can mark attendance and create assignments/exams for any class via the module-level permission grants, but the profile's "My Classes" list only shows classes they're actually assigned to.

### Profile picture permissions
- **Self**: any user (any role) can update/remove their own picture via `/profile/picture` — always was role-agnostic.
- **Students**: admin (`learners.manage`) or teacher (`learners.update_picture`, new narrow permission) can update/remove.
- **Other teachers**: view-only for everyone except the teacher themself — no "admin edits another teacher's photo" path is wired up in this pass.
- **Viewing** any profile picture (own, student, other teacher) has no permission gate beyond the existing roster-view permission (`instructors.view` / `learners.view`) needed to reach the profile page at all.

### Server API
`GET /api/v1/instructors/:id/profile` response shape:
```json
{
  "data": {
    "instructor": { ... },
    "stats": {
      "attendanceMarked": 0,
      "scoresGraded": 0,
      "assignmentsCreated": 0,
      "examsCreated": 0
    },
    "recentAttendance": [ ... ],
    "myClasses": [
      { "id": 1, "name": "Class S1 - A", "student_count": 38, "subject_names": "Mathematics" }
    ]
  }
}
```

### Permissions
- `learners.update_picture` (new) — narrower than `learners.manage`; grants only student profile-picture upload/remove. Granted to `instructor` by default (see `server/lib/permissions.js`).
- Gated via `requirePermission.any('learners.manage', 'learners.update_picture')` on `/profile/picture/learner/:id` (see `server/middleware/permissionGuard.js`).

## Reusable DataTable — pagination, sorting, actions, filters (all 44 list tables)

`client/src/components/DataTable.jsx` is the single shared table primitive for every list/roster page in the app (Students, Teachers, Staff, Guardians, Assignments, Exams, Discipline, Library, PTM, Leave, Access Control, Calendar, Certificates, and 30+ more). This section documents its current API — see `Rules.md` §2 for the mandatory-usage rule.

### Two bugs fixed at the source
1. **Pagination showed one button per page.** A 408-row Students roster at 20/page rendered 21 unbroken number buttons — the original implementation did `Array.from({length: totalPages}).map(...)` with no truncation. Now windowed with `…` ellipsis (first, last, current ±1).
2. **Row actions silently dropped on mobile.** `mobileCompact` mode only ever rendered the primary column + columns explicitly flagged `mobileCompact: true`. Every hand-rolled `{ key: 'actions', ... }` column across the app was neither, so Edit/Delete/etc. were invisible on small screens — reported first on the Teachers roster, but present on every roster page. Fixed structurally with a new first-class `actions` prop (see below) rather than per-page patches, so this class of bug can't recur.

### New/changed props
- **`actions(row) => [{ key, label, icon?, onClick, variant?, hidden?, disabled?, confirm? }]`** — renders inline buttons on desktop, a kebab (⋮) menu on both mobile layouts (compact rows and full cards). `variant: 'danger'` colors it red. `confirm: 'message'` routes the click through the shared `<ConfirmDialog />` instead of firing immediately — replaces the app's remaining scattered `window.confirm` calls in table row actions.
- **Page-size selector**: `pageSizeOptions` prop, default `[10, 20, 50, 100, 'all']`. `'all'` is sent to the server as `pageSize=200` (the server's existing hard cap in `server/lib/pagination.js`) rather than requesting unlimited rows.
- **Sortable columns**: mark a column `sortable: true` (+ optional `sortValue(row)` override). Uncontrolled by default — DataTable sorts the full `rows` array in memory, correct for client-side/unpaginated tables. For server-paginated tables, pass controlled `sort={{key,dir}}` + `onSortChange(key)` and forward `sort`/`order` query params to the list endpoint.
- **`filters` prop**: optional declarative `{ search, fields, onClear, hasActiveFilters }` bar with built-in 300ms search debouncing, replacing hand-rolled search/filter bar markup on most pages that had one.

### Server-side sort support
`server/lib/pagination.js` gained `resolveSort(query, sortMap, defaultOrderBy)`: the client's `?sort=` value is only ever used as a lookup key into a **per-endpoint whitelist** of literal SQL column expressions (`sortMap`) chosen by the server — never concatenated into the query — so it's safe against SQL injection despite the result being spliced into `ORDER BY`. Wired into all 12 paginated list endpoints: `assignments`, `attendance`, `bulkUpload`, `cohorts`, `discipline`, `exams`, `guardians`, `instructors`, `learners`, `modules`, `staff`, `units`.

### Migration scope
All roster/management pages with real row actions were migrated to the `actions` prop (Students, Teachers, Staff, Guardians, Units, Modules, Alumni, Access Control, Assignments, Exams, Discipline, Evaluations, PTM, Visitors, Leave, Library, Calendar, Class Members, Voicemail, Online Exams and their class-scoped tabs, Submissions rosters). Pure read-only display tables (report tabs, detail-page history tables, activity logs, bulk-upload job history) were intentionally left on the base `DataTable` — they have no actions to move and already got the pagination/sorting core improvements for free, since every table in the app shares the same component.

Found and fixed one latent bug while migrating: `ClassMembersTab.jsx` was passing a `pagination` prop that `DataTable` never actually supported (only `serverPagination` existed) — paging was silently falling back to client-side slicing over just the current server page. Fixed to `serverPagination`.

## Flat edge-to-edge lists + Card/FlatList/SectionHeader primitives

Reported bug: mobile list rows (Class Channels, Mark Attendance's class picker, Dashboard's Quick Actions/Today at a Glance) each rendered as their own boxed card — `rounded-2xl border shadow-sm` + a gap to the next row — which compounds with the page's own 16px side padding into excess-looking margin on a phone screen. User referenced iOS Contacts/Settings as the target: rows flush against each other, separated by a hairline divider, no per-row box.

### New primitives (`client/src/components/`)
- **`Card.jsx`** — the existing "premium card" recipe (`bg-surface rounded-2xl shadow-sm border-border`, documented in `Rules.md` §3) as a component. `padding` (default `p-4`), `onClick` (hover/press affordance), `className`.
- **`FlatList.jsx`** (`FlatList` + `FlatRow`) — the new edge-to-edge list. `FlatList` is `divide-y divide-border-subtle` (hairline between rows, never after the last, for free). `FlatRow` covers the common icon+title+subtitle+trailing/chevron row, or accepts `children` for a fully custom row (trailing/chevron still apply after custom children). `to` renders a `Link`, `onClick` a `button`, neither a static row.
- **`SectionHeader.jsx`** — the small uppercase label above a list/section.

### Where flat rows apply vs. where cards stay
- **Flat (`FlatList`/`FlatRow`)**: any list that's a single column at every breakpoint and drills into a detail page — a roster, a class picker. Applied to: Dashboard's Quick Actions + Today at a Glance (mobile only — desktop keeps its existing multi-column/carousel treatment, which is legitimate desktop content, not a stacked-boxes list), the teacher's own "My Classes" picker (`ClassPage.jsx` — never a grid, so flat at every breakpoint), the admin Class Channels picker (mobile only — desktop is a genuine `sm:grid-cols-2 lg:grid-cols-3` grid, so it keeps `ClassCard`), and the Mark Attendance class picker (`AttendancePage.jsx` — never a grid).
- **Still `Card`/boxed**: `DataTable`'s non-`mobileCompact` mode (a genuine card-grid — every column visible, no detail page to drill into), a multi-column grid at wider breakpoints (`ClassCard.jsx` itself, kept for the admin picker's desktop grid), and timelines (a connecting line + dot markers is a different visual metaphor from a list — Today's Schedule, the Behaviour page's incident timeline — these got `<Card>` per item, not flattened).
- **`DataTable.jsx`'s `mobileCompact` mode**: rows were already flat internally (hairline `border-t` divider) — only the outer wrapper had its own box. Dropped that outer box; cascades to all 25 `mobileCompact` roster pages with zero per-page changes.

### `ClassCard` / `ClassListRow` split
`client/src/features/classChannel/components/ClassCard.jsx` exports `deriveClassMeta(cohort, index)` (icon/color/section/subject derivation) so both `ClassCard` (the grid card) and the new `ClassListRow.jsx` (the flat-row rendering) stay visually in sync — same class always gets the same icon/color whether it's rendered as a grid card (desktop) or a flat row (mobile).

### Bug found while migrating
`ClassMembersTab.jsx`-adjacent pattern: none this time, but see the `DataTable` section above for the prior one found in the same initiative.

### Scope note — `onlineExams` module excluded
Per a standing rule added in this session (`Rules.md` §5.9): `client/src/features/onlineExams/**` has no route registered in `App.jsx` and is not imported by any other page (verified by grep) — it's unreachable in the running app and excluded from this and future redesigns.

### Deferred (see `Future_Features.md`)
`LearnerProfilePage.jsx` (11 occurrences) and `InstructorProfilePage.jsx` (8 occurrences) still hand-roll the card recipe rather than using `<Card>` — already using correct theme tokens, so not visually broken, just not componentized yet. `MorePage.jsx`'s 3 clickable nav cards need `Card` extended with Link polymorphism (`as`/`to`) before they can adopt it.
