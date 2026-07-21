import { useNavigate } from 'react-router-dom';
import { StatCard } from '../../../components/StatCard';
import { useOverviewReport } from '../hooks/useReports';
import {
  FiUsers,
  FiUserCheck,
  FiHeart,
  FiBox,
  FiCalendar,
  FiEdit,
  FiAward,
  FiFileText,
  FiBook,
  FiClock,
  FiBell
} from 'react-icons/fi';

export function OverviewTab() {
  const { data, isLoading, error } = useOverviewReport();
  const navigate = useNavigate();

  if (isLoading) return <div className="p-8 text-center text-sm text-ink-500">Loading…</div>;
  if (error) return <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Active Learners" value={data.totalLearners} icon={FiUsers} color="text-blue-600" onClick={() => navigate('/app/learners')} />
      <StatCard label="Instructors" value={data.totalInstructors} icon={FiUserCheck} color="text-indigo-600" onClick={() => navigate('/app/instructors')} />
      <StatCard label="Guardians" value={data.totalGuardians} icon={FiHeart} color="text-pink-600" onClick={() => navigate('/app/guardians')} />
      <StatCard label="Cohorts" value={data.totalCohorts} icon={FiBox} color="text-purple-600" onClick={() => navigate('/app/classes')} />

      <StatCard label="Attendance (30d)" value={data.attendanceRateLast30Days != null ? `${data.attendanceRateLast30Days}%` : '—'} icon={FiCalendar} color="text-emerald-600" onClick={() => navigate('/app/attendance')} />
      <StatCard label="Open Assignments" value={data.assignmentsOpen} icon={FiEdit} color="text-orange-600" onClick={() => navigate('/app/assignments')} />
      <StatCard label="Exams Pending Grade" value={data.onlineExamsPendingGrade} icon={FiFileText} color="text-red-600" onClick={() => navigate('/app/exams')} />
      <StatCard label="Published Exams" value={data.onlineExamsPublished} icon={FiAward} color="text-yellow-600" onClick={() => navigate('/app/exams')} />

      <StatCard label="Library Titles" value={data.libraryTotalTitles} icon={FiBook} color="text-teal-600" onClick={() => navigate('/app/library')} />
      <StatCard label="Overdue Loans" value={data.libraryOverdueLoans} icon={FiClock} color="text-red-600" onClick={() => navigate('/app/library')} />
      <StatCard label="Notices (30d)" value={data.noticesLast30Days} icon={FiBell} color="text-sky-600" onClick={() => navigate('/app/notices')} />
      <StatCard label="Certificates Issued" value={data.certificatesIssued} icon={FiAward} color="text-amber-600" />
    </div>
  );
}
