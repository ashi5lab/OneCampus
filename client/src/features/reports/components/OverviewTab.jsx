import { StatCard } from '../../../components/StatCard';
import { useOverviewReport } from '../hooks/useReports';

export function OverviewTab() {
  const { data, isLoading, error } = useOverviewReport();

  if (isLoading) return <div className="p-8 text-center text-sm text-ink-500">Loading…</div>;
  if (error) return <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>;

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Active Learners" value={data.totalLearners} />
      <StatCard label="Instructors" value={data.totalInstructors} />
      <StatCard label="Guardians" value={data.totalGuardians} />
      <StatCard label="Cohorts" value={data.totalCohorts} />
      <StatCard label="Attendance (30d)" value={data.attendanceRateLast30Days != null ? `${data.attendanceRateLast30Days}%` : '—'} />
      <StatCard label="Open Assignments" value={data.assignmentsOpen} />
      <StatCard label="Exams Pending Grade" value={data.onlineExamsPendingGrade} />
      <StatCard label="Published Exams" value={data.onlineExamsPublished} />
      <StatCard label="Library Titles" value={data.libraryTotalTitles} />
      <StatCard label="Overdue Loans" value={data.libraryOverdueLoans} />
      <StatCard label="Notices (30d)" value={data.noticesLast30Days} />
      <StatCard label="Certificates Issued" value={data.certificatesIssued} />
    </div>
  );
}
