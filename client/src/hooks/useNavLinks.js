import { useConfig } from '../contexts/ConfigContext';
import { useAuth } from '../contexts/AuthContext';

// Single source of truth for "which top-level app sections can this user
// see" — consumed by both Sidebar.jsx and the Dashboard's card view (the
// "V2" toggle's feature-shortcut grid), so the two can never drift out of
// sync with each other. Mirrors the exact same permission/hasModule gates
// as the sidebar always had; Sidebar.jsx layers its own unread-badge flag
// on top of the 'messages' entry afterwards, since that's presentational
// state this hook has no reason to know about.
export function useNavLinks() {
  const { t, hasModule } = useConfig();
  const { can } = useAuth();

  // Evaluations (offline/paper exam score entry) and Online Exams are two
  // distinct modules under the hood but share one "Exams" nav entry — see
  // Sidebar.jsx's original comment for the full reasoning.
  const showExamsLink = (hasModule('exams') && can('evaluations.view')) || can('online_exams.view');

  return [
    can('learners.view') && { to: '/app/learners', label: t('learners') },
    can('instructors.view') && { to: '/app/instructors', label: t('instructors') },
    can('cohorts.view') && { to: '/app/cohorts', label: t('cohorts') },
    can('units.view') && { to: '/app/units', label: 'Units' },
    can('modules.view') && { to: '/app/modules', label: t('topics') },
    can('guardians.view') && { to: '/app/guardians', label: 'Guardians' },
    hasModule('attendance') && can('attendance.view') && { to: '/app/attendance', label: 'Attendance' },
    showExamsLink && { to: '/app/exams', label: 'Exams' },
    hasModule('certificates') && can('certificates.view') && { to: '/app/certificates', label: 'Certificates' },
    hasModule('kindergarten_activity') && can('kindergarten_activity.view') && { to: '/app/kindergarten-activity', label: 'Daily Activity' },
    can('notices.view') && { to: '/app/notices', label: 'Notices' },
    can('library.view') && { to: '/app/library', label: 'Library' },
    can('assignments.view') && { to: '/app/assignments', label: 'Assignments' },
    hasModule('messaging') && can('messages.view') && { to: '/app/messages', label: 'Messages' },
    can('broadcast.view') && { to: '/app/broadcast', label: 'Broadcast' },
    can('leave.apply') && { to: '/app/leave', label: 'Leave' },
    can('calendar.view') && { to: '/app/calendar', label: 'Calendar' },
    can('timetable.view') && { to: '/app/timetable', label: 'Timetable' },
    can('reports.view') && { to: '/app/reports', label: 'Reports' },
    can('access_control.manage') && { to: '/app/access-control', label: 'Access Control' },
    can('bulk_upload.manage') && { to: '/app/bulk-upload', label: 'Bulk Upload' },
    can('staff_attendance.view_own') && { to: '/app/staff-attendance', label: 'Staff Attendance' }
  ].filter(Boolean);
}
