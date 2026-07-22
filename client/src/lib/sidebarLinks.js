// Single source of truth for every optional feature — the Dashboard's
// "Your Modules" grid (gate(can, hasModule) combined with whether the
// tenant has this key enabled as a dashboard app), the More directory
// (same gate, every permitted item regardless of enablement), and
// ManageDashboardAppsPage.jsx (the admin picker: same gate, minus the
// enabled-key check) all render from this list, so they can never drift
// out of sync with each other. Dashboard/Students/Classes/More/Settings
// aren't here — those are the fixed sidebar/bottom-tab items, hardcoded in
// Sidebar.jsx and BottomTabBar.jsx, always shown, nothing to opt in or out of.
export const NAV_LINK_DEFS = [
  { key: 'learners', to: '/app/learners', label: (t) => t('learners'), description: () => 'Manage learner records', gate: (can) => can('learners.view') },
  { key: 'instructors', to: '/app/instructors', label: (t) => t('instructors'), description: () => 'Staff directory & profiles', gate: (can) => can('instructors.view') },
  { key: 'cohorts', to: '/app/cohorts', label: (t) => t('cohorts'), description: () => 'Sections, rosters & subjects', gate: (can) => can('cohorts.view') },
  { key: 'class-channels', to: '/app/class-channels', label: () => 'Class Channels', description: () => 'View and manage all class channels', gate: (can) => can('cohorts.manage') || can('cohorts.view') },
  { key: 'units', to: '/app/units', label: () => 'Units', description: () => 'Departments & structural units', gate: (can) => can('units.view') },
  { key: 'modules', to: '/app/modules', label: (t) => t('topics'), description: () => 'Curriculum units per subject', gate: (can) => can('modules.view') },
  { key: 'guardians', to: '/app/guardians', label: () => 'Guardians', description: () => 'Parent & guardian contacts', gate: (can) => can('guardians.view') },
  { key: 'attendance', to: '/app/attendance', label: () => 'Attendance', description: () => 'Daily attendance tracking', gate: (can, hasModule) => hasModule('attendance') && can('attendance.view') },
  {
    key: 'exams',
    to: '/app/exams',
    label: () => 'Exams',
    description: () => 'Exam schedule & results',
    gate: (can, hasModule) => (hasModule('exams') && can('evaluations.view')) || can('online_exams.view')
  },
  { key: 'certificates', to: '/app/certificates', label: () => 'Certificates', description: () => 'Issue & print certificates', gate: (can, hasModule) => hasModule('certificates') && can('certificates.view') },
  {
    key: 'kindergarten-activity',
    to: '/app/kindergarten-activity',
    label: () => 'Daily Activity',
    description: () => 'Kindergarten activity log',
    gate: (can, hasModule) => hasModule('kindergarten_activity') && can('kindergarten_activity.view')
  },
  { key: 'notices', to: '/app/notices', label: () => 'Notices', description: () => 'School-wide notices', gate: (can) => can('notices.view') },
  { key: 'library', to: '/app/library', label: () => 'Library', description: () => 'Book catalogue & lending', gate: (can) => can('library.view') },
  { key: 'assignments', to: '/app/assignments', label: () => 'Assignments', description: () => 'Homework & submissions', gate: (can) => can('assignments.view') },
  { key: 'messages', to: '/app/messages', label: () => 'Messages', description: () => 'Direct messaging', gate: (can, hasModule) => hasModule('messaging') && can('messages.view') },
  { key: 'broadcast', to: '/app/broadcast', label: () => 'Broadcast', description: () => 'SMS & voicemail announcements', gate: (can) => can('broadcast.view') },
  { key: 'leave', to: '/app/leave', label: () => 'Leave', description: () => 'Apply for & approve leave', gate: (can) => can('leave.apply') },
  { key: 'calendar', to: '/app/calendar', label: () => 'Calendar', description: () => 'School calendar & events', gate: (can) => can('calendar.view') },
  { key: 'timetable', to: '/app/timetable', label: () => 'Timetable', description: () => 'Class schedules', gate: (can) => can('timetable.view') },
  { key: 'reports', to: '/app/reports', label: () => 'Reports', description: () => 'Attendance & performance analytics', gate: (can) => can('reports.view') },
  { key: 'access-control', to: '/app/access-control', label: () => 'Access Control', description: () => 'Roles & permissions', gate: (can) => can('access_control.manage') },
  { key: 'bulk-upload', to: '/app/bulk-upload', label: () => 'Bulk Upload', description: () => 'Import records in bulk', gate: (can) => can('bulk_upload.manage') },
  { key: 'staff-attendance', to: '/app/staff-attendance', label: () => 'Staff Attendance', description: () => 'Teacher attendance tracking', gate: (can) => can('staff_attendance.view_own') },
  { key: 'discipline', to: '/app/discipline', label: () => 'Discipline', description: () => 'Behavior & incident records', gate: (can) => can('discipline.view') },
  { key: 'ptm', to: '/app/ptm', label: () => 'PTM', description: () => 'Parent-teacher meetings', gate: (can) => can('ptm.view') },
  { key: 'alumni', to: '/app/alumni', label: () => 'Alumni', description: () => 'Alumni directory', gate: (can) => can('learners.view') },
  { key: 'visitors', to: '/app/visitors', label: () => 'Visitor Log', description: () => 'Front-desk visitor log', gate: (can) => can('visitors.view') }
];

// Mirrors server/lib/sidebarLinks.js's DEFAULT_DASHBOARD_APPS — used as the
// client-side fallback while ConfigContext's tenant config fetch is still
// loading (config.dashboard_apps itself always has a value once loaded,
// since the backend applies this exact same fallback server-side too).
export const DEFAULT_DASHBOARD_APPS = [
  'learners', 'instructors', 'cohorts', 'attendance', 'broadcast', 'calendar', 'reports', 'access-control'
];
