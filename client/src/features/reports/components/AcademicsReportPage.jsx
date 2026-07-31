import { useState } from 'react';
import { PageHeader } from '../../../components/PageHeader';
import { ExportCsvButton } from '../../../components/ExportCsvButton';
import { AcademicPerformanceTab } from './AcademicPerformanceTab';
import { AssignmentsTab } from './AssignmentsTab';
import { OnlineExamsTab } from './OnlineExamsTab';
import { useStudentSearch } from '../hooks/useReports';
import { CheckCircle2, AlertCircle } from 'lucide-react';

function StudentSearchTab() {
  const [q, setQ] = useState('');
  const { data: result, isLoading } = useStudentSearch({ q });
  const students = result?.data || [];

  const csvColumns = [
    { header: 'Student', value: (r) => r.student_name },
    { header: 'Cohort', value: (r) => r.cohort_name },
    { header: 'Registry No', value: (r) => r.registry_no },
    { header: 'Attendance %', value: (r) => r.attendance_rate ?? '' },
    { header: 'Academics %', value: (r) => r.avg_score ?? '' },
    { header: 'Discipline (30d)', value: (r) => r.discipline_30d }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search student by name or registry no…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="input flex-1 min-w-[240px]"
        />
        {students.length > 0 && <ExportCsvButton filename="student-search" columns={csvColumns} rows={students} />}
      </div>

      {isLoading && q.length >= 2 && <div className="text-center text-sm text-ink-500">Searching...</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {students.map((s) => (
          <div key={s.learner_id} className="rounded border border-border bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-ink-900">{s.student_name}</h4>
                <div className="text-xs text-ink-500">{s.cohort_name} · {s.registry_no}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 border-t border-border pt-3">
              <div className="text-center">
                <div className="text-lg font-bold text-ink-900">{s.attendance_rate !== null ? `${s.attendance_rate}%` : '—'}</div>
                <div className="text-[10px] uppercase tracking-wide text-ink-500">Attendance</div>
              </div>
              <div className="border-l border-border text-center">
                <div className="text-lg font-bold text-ink-900">{s.avg_score !== null ? `${s.avg_score}%` : '—'}</div>
                <div className="text-[10px] uppercase tracking-wide text-ink-500">Academics</div>
              </div>
              <div className="border-l border-border text-center">
                <div className="text-lg font-bold text-ink-900">{s.discipline_30d}</div>
                <div className="text-[10px] uppercase tracking-wide text-ink-500">Discipline</div>
              </div>
            </div>
          </div>
        ))}
        {q.length >= 2 && students.length === 0 && !isLoading && (
          <div className="col-span-full py-8 text-center text-sm text-ink-500">No students found matching "{q}".</div>
        )}
      </div>
    </div>
  );
}

// Own route (/app/reports/academics) instead of a "tab inside a tab" —
// previously ReportsPage's Academics tab opened a second row of buttons
// (Overview / Class Wise / Student Search / Good Scores / Poor Performance
// / Assignments / Exams) inline below the first, which read as one tab
// bar nested in another. Also: Overview, Class Wise, Good Scores and Poor
// Performance all rendered the exact same unsorted table — collapsed down
// to one "Performance" tab whose Good/Poor buttons just change the sort,
// which is the only thing that ever actually differed between them.
const TABS = [
  { id: 'performance', label: 'Performance', Component: () => <AcademicPerformanceTab mode="all" /> },
  { id: 'good-scores', label: 'Good Scores', Component: () => (
    <div>
      <div className="mb-4 flex items-center gap-2 text-success">
        <CheckCircle2 className="h-5 w-5" />
        <h3 className="font-bold">Top Performers</h3>
      </div>
      <AcademicPerformanceTab mode="good" />
    </div>
  ) },
  { id: 'poor-performance', label: 'Needs Attention', Component: () => (
    <div>
      <div className="mb-4 flex items-center gap-2 text-danger">
        <AlertCircle className="h-5 w-5" />
        <h3 className="font-bold">Students Needing Attention</h3>
      </div>
      <AcademicPerformanceTab mode="poor" />
    </div>
  ) },
  { id: 'student-search', label: 'Student Search', Component: StudentSearchTab },
  { id: 'assignments', label: 'Assignments', Component: AssignmentsTab },
  { id: 'exams', label: 'Exams', Component: OnlineExamsTab }
];

export function AcademicsReportPage() {
  const [tab, setTab] = useState('performance');
  const ActiveTab = TABS.find((t) => t.id === tab)?.Component || TABS[0].Component;

  return (
    <div>
      <PageHeader
        eyebrow="Reports"
        title="Academics"
        tabs={
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                  tab === t.id ? 'bg-ink-900 text-white' : 'border border-border bg-surface text-ink-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        }
      />
      <ActiveTab />
    </div>
  );
}
