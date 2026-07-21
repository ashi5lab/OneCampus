import { useAuth } from '../../../contexts/AuthContext';
import { AttendanceRoster } from './AttendanceRoster';
import { MyAttendanceView } from './MyAttendanceView';
import { useMarkActivityContextViewed } from '../../activities/hooks/useActivities';

// The Class channel's Attendance tab. Markers (instructor/admin/staff with
// attendance.mark) get the roster locked to this one cohort — no class
// picker, that's what the full page at /app/attendance is for. Everyone
// else (learner) gets the same read-only view of their own records as the
// full page, since it's already self-scoped and has nothing to lock.
export function ClassAttendanceTab({ cohortId }) {
  const { can } = useAuth();
  const isMarker = can('attendance.mark');
  
  useMarkActivityContextViewed('attendance_global');

  return isMarker ? <AttendanceRoster lockedCohortId={cohortId} /> : <MyAttendanceView />;
}
