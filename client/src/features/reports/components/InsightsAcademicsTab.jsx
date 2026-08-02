import { HorizontalBarChart } from '../../../components/charts/HorizontalBarChart';
import { useAnalyticsReport } from '../hooks/useReports';
import { AcademicPerformanceTab } from './AcademicPerformanceTab';
import { AssignmentsTab } from './AssignmentsTab';
import { OnlineExamsTab } from './OnlineExamsTab';
import { PILLAR } from '../lib/insightsTheme';

const ACADEMICS = PILLAR.academics;
const EXAMS = PILLAR.exams;

function SubHeading({ title }) {
  return <div className="mb-3 mt-8 text-[13.5px] font-bold text-ink-900 first:mt-0">{title}</div>;
}

// Academics & Exams — the summary bars at top, then the full underlying
// detail tables (per-learner scores, assignments, online exams) embedded
// directly rather than only linking out to them, so this is a genuine
// "everything about academics" section, not just two charts.
export function InsightsAcademicsTab() {
  const { data: analytics, isLoading, error } = useAnalyticsReport();

  if (isLoading) return <div className="p-8 text-center text-sm text-ink-500">Loading…</div>;
  if (error) return <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>;

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: ACADEMICS }} />
            <div className="text-[13.5px] font-bold text-ink-900">Average Score by Class</div>
          </div>
          <div className="mb-3 pl-4 text-[11.5px] text-ink-500">All graded evaluations</div>
          <HorizontalBarChart
            data={analytics.performanceByCohort.filter((r) => r.avg_percentage !== null).map((r) => ({ label: r.cohort_name, value: Number(r.avg_percentage) }))}
            color={ACADEMICS}
            valueSuffix="%"
            emptyMessage="No graded evaluations yet."
          />
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: EXAMS }} />
            <div className="text-[13.5px] font-bold text-ink-900">Online Exam Pass Rates</div>
          </div>
          <div className="mb-3 pl-4 text-[11.5px] text-ink-500">Published exams with graded submissions</div>
          <HorizontalBarChart
            data={analytics.examPassRates.filter((r) => r.pass_rate !== null).map((r) => ({ label: r.title, value: Number(r.pass_rate) }))}
            color={EXAMS}
            valueSuffix="%"
            emptyMessage="No graded online exams yet."
          />
        </div>
      </div>

      <SubHeading title="Every Learner's Score" />
      <AcademicPerformanceTab mode="all" />

      <SubHeading title="Assignments" />
      <AssignmentsTab />

      <SubHeading title="Online Exams" />
      <OnlineExamsTab />
    </div>
  );
}
