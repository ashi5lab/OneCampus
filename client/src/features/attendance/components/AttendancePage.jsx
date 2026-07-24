import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { PageHeader } from '../../../components/PageHeader';
import { AttendanceRoster } from './AttendanceRoster';
import { MyAttendanceView } from './MyAttendanceView';
import { useCohorts } from '../../cohorts/hooks/useCohorts';
import { TeacherHeader } from '../../../components/TeacherHeader';
import { ChevronRight, Clock, CheckCircle2 } from 'lucide-react';

export function AttendancePage() {
  const { can } = useAuth();
  const { cohortId } = useParams();
  const isMarker = can('attendance.mark');

  if (!isMarker) {
    return (
      <div>
        <PageHeader title="My Attendance" />
        <MyAttendanceView />
      </div>
    );
  }

  if (cohortId) {
    return (
      <div className="bg-[#f8f9fe] min-h-screen pb-24 font-body">
        {/* We'll handle the roster's custom header inside AttendanceRoster, or here. */}
        <AttendanceRoster lockedCohortId={cohortId} />
      </div>
    );
  }

  return <AttendancePicker />;
}

function AttendancePicker() {
  const { data: cohorts, isLoading } = useCohorts();

  if (isLoading) return <div className="p-8 text-center text-sm text-gray-500">Loading…</div>;

  const list = cohorts || [];

  return (
    <div className="bg-[#f8f9fe] min-h-screen pb-24 font-body">
      <TeacherHeader 
        title="Mark Attendance" 
        subtitle="Select a class to continue" 
        showSearch={true} 
        searchPlaceholder="Search classes..." 
        actionIcon="filter" 
      />
      
      <div className="px-4 relative z-20 space-y-4 pt-4">
        {list.map((c, i) => (
          <Link
            key={c.id}
            to={`/app/attendance/${c.id}`}
            className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-transform active:scale-[0.99] hover:shadow-md"
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-700 rounded-2xl flex items-center justify-center text-[18px] font-bold">
                  {(c.name || '?')[0].toUpperCase()}
                </div>
                <div>
                  <div className="text-[16px] font-bold text-gray-900">{c.name}</div>
                  <div className="text-[12px] font-medium text-gray-500">Period 1 • 09:00 AM - 09:45 AM</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>

            <div className="flex gap-2 mt-1">
              <div className="flex-1 bg-gray-50 rounded-xl p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
                  <Clock className="w-3.5 h-3.5" />
                  Status
                </div>
                <div className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                  Pending
                </div>
              </div>
              <div className="flex-1 bg-gray-50 rounded-xl p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Present
                </div>
                <div className="text-[11px] font-bold text-gray-900">
                  --/--
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
