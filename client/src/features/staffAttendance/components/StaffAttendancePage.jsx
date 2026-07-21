import { useAuth } from '../../../contexts/AuthContext';
import { PageHeader } from '../../../components/PageHeader';
import { StaffAttendanceRoster } from './StaffAttendanceRoster';
import { MyStaffAttendanceView } from './MyStaffAttendanceView';

// Mirrors features/attendance/components/AttendancePage.jsx's split: anyone
// who can see the full roster (staff_attendance.view — admin/staff) gets the
// marking roster; a plain instructor (staff_attendance.view_own only) gets a
// read-only view of just their own history.
export function StaffAttendancePage() {
  const { can } = useAuth();
  const canViewRoster = can('staff_attendance.view');

  return (
    <div>
      <PageHeader
        eyebrow={canViewRoster ? 'Management / Staff Attendance' : 'Staff Attendance'}
        title={canViewRoster ? 'Staff Attendance' : 'My Attendance'}
      />

      {canViewRoster ? <StaffAttendanceRoster /> : <MyStaffAttendanceView />}
    </div>
  );
}
