// Single source of truth for every optional sidebar nav item — both
// useNavLinks.js (per-user visibility: gate(can, hasModule) combined with
// whether the tenant has this key enabled) and ManageSidebarPage.jsx (the
// admin picker: same gate, minus the enabled-key check) render from this
// list, so they can never drift out of sync with each other. Dashboard
// isn't here at all — it's hardcoded in Sidebar.jsx and always shown,
// there's nothing to opt in or out of.
export const NAV_LINK_DEFS = [
  { key: 'learners', to: '/app/learners', label: (t) => t('learners'), gate: (can) => can('learners.view') },
  { key: 'instructors', to: '/app/instructors', label: (t) => t('instructors'), gate: (can) => can('instructors.view') },
  { key: 'cohorts', to: '/app/cohorts', label: (t) => t('cohorts'), gate: (can) => can('cohorts.view') },
  { key: 'units', to: '/app/units', label: () => 'Units', gate: (can) => can('units.view') },
  { key: 'modules', to: '/app/modules', label: (t) => t('topics'), gate: (can) => can('modules.view') },
  { key: 'guardians', to: '/app/guardians', label: () => 'Guardians', gate: (can) => can('guardians.view') },
  { key: 'attendance', to: '/app/attendance', label: () => 'Attendance', gate: (can, hasModule) => hasModule('attendance') && can('attendance.view') },
  {
    key: 'exams',
    to: '/app/exams',
    label: () => 'Exams',
    gate: (can, hasModule) => (hasModule('exams') && can('evaluations.view')) || can('online_exams.view')
  },
  { key: 'certificates', to: '/app/certificates', label: () => 'Certificates', gate: (can, hasModule) => hasModule('certificates') && can('certificates.view') },
  {
    key: 'kindergarten-activity',
    to: '/app/kindergarten-activity',
    label: () => 'Daily Activity',
    gate: (can, hasModule) => hasModule('kindergarten_activity') && can('kindergarten_activity.view')
  },
  { key: 'notices', to: '/app/notices', label: () => 'Notices', gate: (can) => can('notices.view') },
  { key: 'library', to: '/app/library', label: () => 'Library', gate: (can) => can('library.view') },
  { key: 'assignments', to: '/app/assignments', label: () => 'Assignments', gate: (can) => can('assignments.view') },
  { key: 'messages', to: '/app/messages', label: () => 'Messages', gate: (can, hasModule) => hasModule('messaging') && can('messages.view') },
  { key: 'broadcast', to: '/app/broadcast', label: () => 'Broadcast', gate: (can) => can('broadcast.view') },
  { key: 'leave', to: '/app/leave', label: () => 'Leave', gate: (can) => can('leave.apply') },
  { key: 'calendar', to: '/app/calendar', label: () => 'Calendar', gate: (can) => can('calendar.view') },
  { key: 'timetable', to: '/app/timetable', label: () => 'Timetable', gate: (can) => can('timetable.view') },
  { key: 'reports', to: '/app/reports', label: () => 'Reports', gate: (can) => can('reports.view') },
  { key: 'access-control', to: '/app/access-control', label: () => 'Access Control', gate: (can) => can('access_control.manage') },
  { key: 'bulk-upload', to: '/app/bulk-upload', label: () => 'Bulk Upload', gate: (can) => can('bulk_upload.manage') },
  { key: 'staff-attendance', to: '/app/staff-attendance', label: () => 'Staff Attendance', gate: (can) => can('staff_attendance.view_own') },
  { key: 'discipline', to: '/app/discipline', label: () => 'Discipline', gate: (can) => can('discipline.view') },
  { key: 'ptm', to: '/app/ptm', label: () => 'PTM', gate: (can) => can('ptm.view') },
  { key: 'alumni', to: '/app/alumni', label: () => 'Alumni', gate: (can) => can('learners.view') },
  { key: 'visitors', to: '/app/visitors', label: () => 'Visitor Log', gate: (can) => can('visitors.view') }
];

// Mirrors server/lib/sidebarLinks.js's DEFAULT_SIDEBAR_LINKS — used as the
// client-side fallback while ConfigContext's tenant config fetch is still
// loading (config.sidebar_links itself always has a value once loaded,
// since the backend applies this exact same fallback server-side too).
export const DEFAULT_SIDEBAR_LINKS = ['learners', 'instructors', 'cohorts'];
