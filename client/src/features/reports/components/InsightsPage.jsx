import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/PageHeader';
import { StatCard } from '../../../components/StatCard';
import { DataTable } from '../../../components/DataTable';
import { ExportCsvButton } from '../../../components/ExportCsvButton';
import { TrendLineChart } from '../../../components/charts/TrendLineChart';
import { HorizontalBarChart } from '../../../components/charts/HorizontalBarChart';
import { useOverviewReport, useAnalyticsReport, useClassWiseReport } from '../hooks/useReports';
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
import { Award } from 'lucide-react';

const STATUS_LABEL = { present: 'Present', absent: 'Absent', late: 'Late', excused: 'Excused' };
const STATUS_COLOR = { present: 'var(--success)', absent: 'var(--danger)', late: 'var(--accent)', excused: 'var(--ink-500)' };
const SEVERITY_LABEL = { positive: 'Positive', minor: 'Minor', major: 'Major' };
const SEVERITY_COLOR = { positive: 'var(--success)', minor: 'var(--accent)', major: 'var(--danger)' };

function shortDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function SectionHeading({ eyebrow, title }) {
  return (
    <div className="mb-3 mt-8 first:mt-0">
      {eyebrow && <div className="text-[11px] font-bold uppercase tracking-wide text-ink-400">{eyebrow}</div>}
      <h2 className="text-[16px] font-bold text-ink-900">{title}</h2>
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="rounded border border-border bg-surface p-4">
      <div className="mb-1 text-[13.5px] font-bold text-ink-900">{title}</div>
      {subtitle && <div className="mb-3 text-[11.5px] text-ink-500">{subtitle}</div>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </div>
  );
}

function QuickLinkCard({ icon: Icon, title, description, to }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-shadow hover:shadow-md"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[13.5px] font-bold text-ink-900">{title}</div>
        <div className="text-[12px] text-ink-500">{description}</div>
      </div>
    </button>
  );
}

// Own route (/app/reports/more) — the redesigned successor to the old
// "More" tab's nested Overview/Analytics/Library/Certificates sub-tab
// switcher. Merges the org-wide quick stats and trend charts into one
// flowing insights page (no inner tabs to click through), adds a
// class-wise breakdown table that was previously nowhere in this section,
// and points out to Library/Certificates (which already have their own
// good, dedicated table views) as quick links rather than cramming them
// in as more sub-tabs.
export function InsightsPage() {
  const navigate = useNavigate();
  const { data: overview, isLoading: overviewLoading, error: overviewError } = useOverviewReport();
  const { data: analytics, isLoading: analyticsLoading, error: analyticsError } = useAnalyticsReport();
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const to = new Date().toISOString().slice(0, 10);
  const { data: classWise } = useClassWiseReport({ from, to });

  const isLoading = overviewLoading || analyticsLoading;
  const error = overviewError || analyticsError;

  const classRows = classWise?.data || [];
  const classColumns = [
    { key: 'cohort_name', header: 'Class', sortable: true, render: (row) => row.cohort_name },
    { key: 'student_count', header: 'Students', sortable: true, render: (row) => row.student_count ?? 0 },
    { key: 'attendance_rate', header: 'Attendance', sortable: true, render: (row) => (row.attendance_rate != null ? `${row.attendance_rate}%` : '—') },
    { key: 'avg_score', header: 'Avg Score', sortable: true, render: (row) => (row.avg_score != null ? `${row.avg_score}%` : '—') },
    { key: 'discipline_total', header: 'Discipline', sortable: true, render: (row) => row.discipline_total ?? 0 }
  ];
  const classCsvColumns = [
    { header: 'Class', value: (r) => r.cohort_name },
    { header: 'Students', value: (r) => r.student_count ?? 0 },
    { header: 'Attendance %', value: (r) => r.attendance_rate ?? '' },
    { header: 'Avg Score %', value: (r) => r.avg_score ?? '' },
    { header: 'Discipline', value: (r) => r.discipline_total ?? 0 }
  ];

  return (
    <div>
      <PageHeader eyebrow="Reports" title="Insights" subtitle="Organization-wide analytics, trends & class breakdowns" />

      {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading insights…</div>}
      {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}

      {!isLoading && !error && overview && analytics && (
        <>
          <SectionHeading eyebrow="Snapshot" title="At a Glance" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Active Learners" value={overview.totalLearners} icon={FiUsers} color="text-blue-600" onClick={() => navigate('/app/learners')} />
            <StatCard label="Instructors" value={overview.totalInstructors} icon={FiUserCheck} color="text-indigo-600" onClick={() => navigate('/app/instructors')} />
            <StatCard label="Guardians" value={overview.totalGuardians} icon={FiHeart} color="text-pink-600" onClick={() => navigate('/app/guardians')} />
            <StatCard label="Cohorts" value={overview.totalCohorts} icon={FiBox} color="text-purple-600" onClick={() => navigate('/app/classes')} />
            <StatCard label="Attendance (30d)" value={overview.attendanceRateLast30Days != null ? `${overview.attendanceRateLast30Days}%` : '—'} icon={FiCalendar} color="text-emerald-600" onClick={() => navigate('/app/reports/attendance')} />
            <StatCard label="Open Assignments" value={overview.assignmentsOpen} icon={FiEdit} color="text-orange-600" onClick={() => navigate('/app/assignments')} />
            <StatCard label="Exams Pending Grade" value={overview.onlineExamsPendingGrade} icon={FiFileText} color="text-red-600" onClick={() => navigate('/app/exams')} />
            <StatCard label="Published Exams" value={overview.onlineExamsPublished} icon={FiAward} color="text-yellow-600" onClick={() => navigate('/app/exams')} />
          </div>

          <SectionHeading eyebrow="Trends" title="Attendance & Discipline" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Attendance Rate" subtitle="Last 14 days, tenant-wide">
              <TrendLineChart data={analytics.attendanceTrend.map((r) => ({ label: shortDate(r.date), value: r.rate }))} valueSuffix="%" emptyMessage="No attendance recorded yet." />
            </ChartCard>
            <ChartCard title="Today's Attendance" subtitle="By status">
              <HorizontalBarChart
                data={['present', 'absent', 'late', 'excused'].map((status) => ({
                  label: STATUS_LABEL[status],
                  value: analytics.attendanceToday.find((r) => r.status === status)?.count ?? 0,
                  color: STATUS_COLOR[status]
                }))}
                valueSuffix=""
                emptyMessage="No attendance marked today."
              />
            </ChartCard>
            <ChartCard title="Discipline Incidents" subtitle="Last 30 days, by severity">
              <HorizontalBarChart
                data={['positive', 'minor', 'major'].map((severity) => ({
                  label: SEVERITY_LABEL[severity],
                  value: analytics.disciplineBySeverity30d.find((r) => r.severity === severity)?.count ?? 0,
                  color: SEVERITY_COLOR[severity]
                }))}
                valueSuffix=""
                emptyMessage="No incidents logged in the last 30 days."
              />
            </ChartCard>
            <ChartCard title="Visitor Traffic" subtitle="Last 14 days, gate check-ins">
              <TrendLineChart data={analytics.visitorTrend.map((r) => ({ label: shortDate(r.date), value: r.count }))} valueSuffix="" emptyMessage="No visitors logged yet." />
            </ChartCard>
          </div>

          <SectionHeading eyebrow="Academics" title="Performance" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Academic Performance" subtitle="Average score by class">
              <HorizontalBarChart
                data={analytics.performanceByCohort.filter((r) => r.avg_percentage !== null).map((r) => ({ label: r.cohort_name, value: Number(r.avg_percentage) }))}
                valueSuffix="%"
                emptyMessage="No graded evaluations yet."
              />
            </ChartCard>
            <ChartCard title="Online Exam Pass Rates" subtitle="Published exams with graded submissions">
              <HorizontalBarChart
                data={analytics.examPassRates.filter((r) => r.pass_rate !== null).map((r) => ({ label: r.title, value: Number(r.pass_rate) }))}
                valueSuffix="%"
                emptyMessage="No graded online exams yet."
              />
            </ChartCard>
          </div>

          <SectionHeading eyebrow="Other" title="Operations" />
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Staff Attendance Rate (30d)" value={analytics.staffAttendanceRate30d != null ? `${analytics.staffAttendanceRate30d}%` : '—'} />
            <StatCard label="PTM Slots Booked" value={analytics.ptmTotalSlots > 0 ? `${analytics.ptmBookedSlots} / ${analytics.ptmTotalSlots} (${analytics.ptmBookingRate}%)` : '—'} />
            <StatCard label="Outstanding Library Fines" value={analytics.outstandingLibraryFines} />
            <StatCard label="Library Titles" value={overview.libraryTotalTitles} icon={FiBook} color="text-teal-600" onClick={() => navigate('/app/reports/more/library')} />
            <StatCard label="Overdue Loans" value={overview.libraryOverdueLoans} icon={FiClock} color="text-red-600" onClick={() => navigate('/app/reports/more/library')} />
            <StatCard label="Notices (30d)" value={overview.noticesLast30Days} icon={FiBell} color="text-sky-600" onClick={() => navigate('/app/notices')} />
          </div>

          <SectionHeading eyebrow="Class Wise" title="Class Breakdown (Last 30 Days)" />
          <div className="rounded border border-border bg-surface">
            <div className="flex flex-wrap items-center justify-end gap-3 border-b border-border px-4 py-3">
              <ExportCsvButton filename="insights-class-breakdown" columns={classCsvColumns} rows={classRows} />
            </div>
            <DataTable rows={classRows} columns={classColumns} rowKey={(row) => row.cohort_id} emptyMessage="No classes found." />
          </div>

          <SectionHeading eyebrow="Student Wise" title="Look Up a Student" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <QuickLinkCard
              icon={FiUsers}
              title="Search Students"
              description="Attendance, academics & discipline for any individual student"
              to="/app/reports/academics"
            />
            <QuickLinkCard
              icon={Award}
              title="Certificates"
              description="Issued certificates by type & recent activity"
              to="/app/reports/more/certificates"
            />
          </div>
        </>
      )}
    </div>
  );
}
