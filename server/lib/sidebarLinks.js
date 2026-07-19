// Whitelist of every feature a tenant admin can toggle on/off as a
// Dashboard "app" card (see client/src/lib/sidebarLinks.js's NAV_LINK_DEFS
// — kept in sync by hand since this side only needs the keys to validate a
// PATCH payload, not the labels/routes/gates needed to actually render
// anything). The sidebar/bottom-tab nav itself (Dashboard/Students/Classes/
// More/Settings) is fixed and not covered by this list at all.
const DASHBOARD_APP_KEYS = [
  'learners', 'instructors', 'cohorts', 'units', 'modules', 'guardians',
  'attendance', 'exams', 'certificates', 'kindergarten-activity', 'notices',
  'library', 'assignments', 'messages', 'broadcast', 'leave', 'calendar',
  'timetable', 'reports', 'access-control', 'bulk-upload', 'staff-attendance',
  'discipline', 'ptm', 'alumni', 'visitors'
];

// Every tenant starts with this set pinned to the Dashboard's "Your
// Modules" grid — everything else is opt-in via Settings > Manage
// Dashboard Apps, and always reachable regardless via the More directory.
const DEFAULT_DASHBOARD_APPS = [
  'learners', 'instructors', 'cohorts', 'attendance', 'broadcast', 'calendar', 'reports', 'access-control'
];

module.exports = { DASHBOARD_APP_KEYS, DEFAULT_DASHBOARD_APPS };
