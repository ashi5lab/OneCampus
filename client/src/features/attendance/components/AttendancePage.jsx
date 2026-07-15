import { useAuth } from '../../../contexts/AuthContext';
import { AttendanceRoster } from './AttendanceRoster';

export function AttendancePage() {
  const { can } = useAuth();

  return (
    <div>
      <div className="mb-6">
        <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">
          Management / Attendance
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">Attendance</h1>
      </div>

      {can('attendance.mark') && <AttendanceRoster />}
    </div>
  );
}
