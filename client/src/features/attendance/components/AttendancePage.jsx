import { useAuth } from '../../../contexts/AuthContext';
import { PageHeader } from '../../../components/PageHeader';
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
      <PageHeader
        eyebrow={isMarker ? 'Management / Attendance' : 'Attendance'}
        title={isMarker ? 'Attendance' : 'My Attendance'}
      />

      {isMarker ? <AttendanceRoster /> : <MyAttendanceView />}
    </div>
  );
}
