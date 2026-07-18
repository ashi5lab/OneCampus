import { useAuth } from '../../../contexts/AuthContext';
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
      <div className="mb-6">
        <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">
          {canViewRoster ? 'Management / Staff Attendance' : 'Staff Attendance'}
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">
          {canViewRoster ? 'Staff Attendance' : 'My Attendance'}
        </h1>
      </div>

      {canViewRoster ? <StaffAttendanceRoster /> : <MyStaffAttendanceView />}
    </div>
  );
}
