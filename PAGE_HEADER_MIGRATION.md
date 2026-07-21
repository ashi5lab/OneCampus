# Page Header / Back Button Consistency Pass

## Why

Screens across the app had inconsistent headers: some pages had a full-width
"Back" row (from `Layout.jsx`), others had a page-specific "← Back to X" link
at the bottom, and a few had both — so a user could see two different ways to
go back on the same screen, and title/subtitle placement varied page to page.

The Class page (`ClassChannel`) already had the layout we wanted everywhere:
a small back icon inline to the left of the title, an eyebrow label, a title,
a tooltip-collapsing subtitle, and a tabs row — consistent on both mobile and
desktop.

## What changed

- **New shared component**: `client/src/components/PageHeader.jsx`
  - `PageHeader` — eyebrow / title / subtitle / actions / tabs, with an
    automatic back icon inline to the left of the title.
  - `BackButton` + `useAutoBack()` — exported separately for the handful of
    pages whose header isn't the standard eyebrow+title shape (avatar-centric
    profile pages) but still need the identical back button and "should this
    route show one" logic.
  - Back button visibility is automatic: every route is considered to have a
    back button *except* the bottom-tab-bar's own fixed destinations
    (`/app`, `/app/learners`, `/app/cohorts`, `/app/class`, `/app/activities`,
    `/app/more`, `/app/profile`), which have nothing shallower to pop back to.
  - `back`/`onBack` props exist only for pages whose back destination isn't
    simply "the previous route" (e.g. `ClassChannel`, where a single-class
    user's `/app/class` *is* their channel and a multi-class user's is one
    level under the class picker, with no URL difference between the two).

- **`Layout.jsx`**: removed the old generic mobile-only "Back" row and its
  `ROOT_PATHS` list — that job now belongs entirely to `PageHeader`.

- **Every non-root page migrated** to `PageHeader` (or `BackButton` +
  `useAutoBack` for the three avatar-centric profile pages), and every
  redundant page-specific "← Back to X" link removed, so each screen has
  exactly one back affordance. This includes: Assignments, Exams, Attendance,
  Certificates, Kindergarten Activity, Library, Modules, Notices, PTM,
  Discipline, Alumni, Visitor Log, Leave, Messages, Guardians, Instructors
  (+ Teachers sub-tab), Learners, Cohorts (+ Cohort Detail's Modules/Teachers
  views), Units, Access Control, Broadcast, Staff Attendance, Bulk Upload,
  Reports, Manage Dashboard Apps, More, Profile, Activities, Calendar,
  Timetable, Assignment Detail, Online Exam Detail, Evaluation Detail, Score
  Grading Roster, My Score View, Class (picker), and the three profile pages
  (Learner/Instructor/Guardian).

- Pages with an **in-page sub-view** rather than a route change (Profile's
  mobile section drill-down, Cohort Detail's Teachers tab) keep their local
  `setState(null)`-style back handler, just restyled with the shared
  `BackButton` icon instead of a hand-rolled SVG, so the click behavior is
  unchanged but the visual is consistent.

- Deliberately left as-is: `HomeInsightsPage`/`DashboardPage` (root "greeting"
  screens reachable from the bottom tab bar — no back button needed by
  design) and `LandingPage`/`SuperAdminLoginPage`/`LoginPage`/
  `TenantRegisterPage` (outside the tenant-app `Layout` shell entirely).

## Verification

- `npx vite build` passes cleanly with no errors or new warnings.
- Manually swept the codebase for leftover "Back to X" links and hand-rolled
  back-arrow SVGs outside `PageHeader.jsx` — none remain in the app shell.
