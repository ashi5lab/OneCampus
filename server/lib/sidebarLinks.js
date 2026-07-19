// Whitelist of nav items a tenant admin can toggle on/off in the sidebar
// (see client/src/lib/sidebarLinks.js's NAV_LINK_DEFS — kept in sync by
// hand since this side only needs the keys to validate a PATCH payload,
// not the labels/routes/gates needed to actually render anything).
const SIDEBAR_LINK_KEYS = [
  'learners', 'instructors', 'cohorts', 'units', 'modules', 'guardians',
  'attendance', 'exams', 'certificates', 'kindergarten-activity', 'notices',
  'library', 'assignments', 'messages', 'broadcast', 'leave', 'calendar',
  'timetable', 'reports', 'access-control', 'bulk-upload', 'staff-attendance',
  'discipline', 'ptm', 'alumni', 'visitors'
];

// Every tenant starts with just Students/Teachers/Classes in the sidebar
// (Dashboard is always shown separately, outside this list entirely) —
// everything else is opt-in via the Manage Sidebar settings page.
const DEFAULT_SIDEBAR_LINKS = ['learners', 'instructors', 'cohorts'];

module.exports = { SIDEBAR_LINK_KEYS, DEFAULT_SIDEBAR_LINKS };
