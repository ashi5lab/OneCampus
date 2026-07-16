import { useAnalyticsReport } from '../hooks/useReports';
import { TrendLineChart } from '../../../components/charts/TrendLineChart';
import { HorizontalBarChart } from '../../../components/charts/HorizontalBarChart';

const STATUS_LABEL = { present: 'Present', absent: 'Absent', late: 'Late', excused: 'Excused' };
// Status colors are reserved (good/warning/serious/critical) and carry a
// text label alongside them, never color alone — see the bars' own labels.
const STATUS_COLOR = { present: 'var(--success)', absent: 'var(--danger)', late: 'var(--accent)', excused: 'var(--ink-500)' };

function shortDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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

export function AnalyticsTab() {
  const { data, isLoading, error } = useAnalyticsReport();

  if (isLoading) return <div className="p-8 text-center text-sm text-ink-500">Loading…</div>;
  if (error) return <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>;

  const attendanceTrend = data.attendanceTrend.map((row) => ({ label: shortDate(row.date), value: row.rate }));

  const attendanceToday = ['present', 'absent', 'late', 'excused'].map((status) => ({
    label: STATUS_LABEL[status],
    value: data.attendanceToday.find((r) => r.status === status)?.count ?? 0,
    color: STATUS_COLOR[status]
  }));

  const performanceByCohort = data.performanceByCohort
    .filter((row) => row.avg_percentage !== null)
    .map((row) => ({ label: row.cohort_name, value: Number(row.avg_percentage) }));

  const examPassRates = data.examPassRates
    .filter((row) => row.pass_rate !== null)
    .map((row) => ({ label: row.title, value: Number(row.pass_rate) }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard title="Attendance Rate" subtitle="Last 14 days, tenant-wide">
        <TrendLineChart data={attendanceTrend} valueSuffix="%" emptyMessage="No attendance recorded yet." />
      </ChartCard>

      <ChartCard title="Today's Attendance" subtitle="By status">
        <HorizontalBarChart data={attendanceToday} valueSuffix="" emptyMessage="No attendance marked today." />
      </ChartCard>

      <ChartCard title="Academic Performance" subtitle="Average score by class">
        <HorizontalBarChart data={performanceByCohort} valueSuffix="%" emptyMessage="No graded evaluations yet." />
      </ChartCard>

      <ChartCard title="Online Exam Pass Rates" subtitle="Published exams with graded submissions">
        <HorizontalBarChart data={examPassRates} valueSuffix="%" emptyMessage="No graded online exams yet." />
      </ChartCard>
    </div>
  );
}
