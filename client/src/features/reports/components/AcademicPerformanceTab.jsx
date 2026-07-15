import { useState } from 'react';
import { DataTable } from '../../../components/DataTable';
import { useCohorts } from '../../cohorts/hooks/useCohorts';
import { useModules } from '../../modules/hooks/useModules';
import { useAcademicPerformanceReport } from '../hooks/useReports';
import { useConfig } from '../../../contexts/ConfigContext';

export function AcademicPerformanceTab() {
  const { t } = useConfig();
  const { data: cohorts } = useCohorts();
  const { data: modules } = useModules();
  const [cohortId, setCohortId] = useState('');
  const [moduleId, setModuleId] = useState('');
  const { data: rows, isLoading, error } = useAcademicPerformanceReport({
    cohort_id: cohortId || undefined,
    module_id: moduleId || undefined
  });

  const columns = [
    { key: 'learner', header: 'Learner', render: (row) => `${row.first_name} ${row.last_name}` },
    { key: 'cohort', header: t('cohort'), render: (row) => row.cohort_name },
    { key: 'taken', header: 'Evaluations Taken', render: (row) => row.evaluations_taken },
    { key: 'avg', header: 'Average', render: (row) => (row.avg_percentage != null ? `${row.avg_percentage}%` : '—') }
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-xs font-semibold text-ink-700">
          {t('cohort')}
          <select className="input ml-2" value={cohortId} onChange={(e) => setCohortId(e.target.value)}>
            <option value="">All cohorts</option>
            {(cohorts || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-ink-700">
          {t('topic')}
          <select className="input ml-2" value={moduleId} onChange={(e) => setModuleId(e.target.value)}>
            <option value="">All subjects</option>
            {(modules || []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="overflow-hidden rounded border border-border bg-surface">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}
        {rows && <DataTable columns={columns} rows={rows} rowKey={(row) => row.learner_id} emptyMessage="No evaluation scores recorded yet." />}
      </div>
    </div>
  );
}
