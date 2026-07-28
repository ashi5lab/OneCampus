import { useState } from 'react';
import { AcademicPerformanceTab } from './AcademicPerformanceTab';
import { AssignmentsTab } from './AssignmentsTab';
import { OnlineExamsTab } from './OnlineExamsTab';
import { useStudentSearch } from '../hooks/useReports';
import { Badge } from '../../../components/Badge';
import { CheckCircle2, AlertCircle } from 'lucide-react';

function StudentSearchTab() {
  const [q, setQ] = useState('');
  const { data: result, isLoading } = useStudentSearch({ q });
  
  const students = result?.data || [];

  return (
    <div className="space-y-4">
      <input
        type="search"
        placeholder="Search student by name or registry no..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full rounded border border-border bg-surface px-4 py-2 text-sm outline-none focus:border-ink-500"
      />

      {isLoading && q.length >= 2 && <div className="text-center text-sm text-ink-500">Searching...</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {students.map(s => (
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

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'class-wise', label: 'Class Wise' },
  { id: 'student-search', label: 'Student Search' },
  { id: 'good-scores', label: 'Good Scores' },
  { id: 'poor-performance', label: 'Poor Performance' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'exams', label: 'Exams' }
];

export function AcademicsTab() {
  const [tab, setTab] = useState('overview');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded px-3 py-1.5 text-xs font-semibold ${
              tab === t.id ? 'bg-ink-900 text-white' : 'bg-surface text-ink-700 hover:bg-surface-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <AcademicPerformanceTab />}
      {tab === 'class-wise' && <AcademicPerformanceTab />}
      {tab === 'student-search' && <StudentSearchTab />}
      {tab === 'good-scores' && (
        <div>
          <div className="mb-4 flex items-center gap-2 text-success">
            <CheckCircle2 className="h-5 w-5" />
            <h3 className="font-bold">Top Performers</h3>
          </div>
          <AcademicPerformanceTab />
        </div>
      )}
      {tab === 'poor-performance' && (
        <div>
          <div className="mb-4 flex items-center gap-2 text-danger">
            <AlertCircle className="h-5 w-5" />
            <h3 className="font-bold">Students Needing Attention</h3>
          </div>
          <AcademicPerformanceTab />
        </div>
      )}
      {tab === 'assignments' && <AssignmentsTab />}
      {tab === 'exams' && <OnlineExamsTab />}
    </div>
  );
}
