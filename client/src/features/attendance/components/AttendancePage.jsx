import { useAuth } from '../../../contexts/AuthContext';
import { AttendanceRoster } from './AttendanceRoster';
import { MyAttendanceView } from './MyAttendanceView';

// Markers (admin/staff/instructor, attendance.mark) get the cohort marking
// roster; everyone else with attendance.view (learner/guardian) gets a
// read-only view of their own — or their children's — records. Previously
// non-markers got a bare header and an empty page.
export function AttendancePage() {
  const { can } = useAuth();
  const isMarker = can('attendance.mark');

  return (
    <div>
      <div className="mb-6">
        <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">
          {isMarker ? 'Management / Attendance' : 'Attendance'}
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">
          {isMarker ? 'Attendance' : 'My Attendance'}
        </h1>
      </div>

      {isMarker ? <AttendanceRoster /> : <MyAttendanceView />}
    </div>
  );
}
