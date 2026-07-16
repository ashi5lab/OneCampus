import { useState } from 'react';
import { EvaluationsPage } from '../../evaluations/components/EvaluationsPage';
import { OnlineExamsPage } from '../../onlineExams/components/OnlineExamsPage';

const TABS = [
  { value: 'evaluations', label: 'Evaluations' },
  { value: 'online', label: 'Online Exams' }
];

// Evaluations (offline/paper exam score entry) and Online Exams remain two
// separate backend modules with their own routes for detail views
// (evaluations/:id, evaluations/schedules/:scheduleId/scores,
// online-exams/:id) — only the two list views are merged here, as tabs
// under one "Exams" page, per the user's explicit request to stop treating
// them as separate top-level nav destinations.
export function ExamsPage() {
  const [tab, setTab] = useState('evaluations');

  return (
    <div>
      <div className="mb-6">
        <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">Exams</div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">Exams</h1>
      </div>

      <div className="mb-5 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              tab === t.value ? 'bg-ink-900 text-white' : 'border border-border bg-surface text-ink-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'evaluations' ? <EvaluationsPage /> : <OnlineExamsPage />}
    </div>
  );
}
