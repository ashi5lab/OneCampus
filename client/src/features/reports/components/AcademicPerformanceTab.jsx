import { useState } from 'react';
import { DataTable } from '../../../components/DataTable';
import { ExportCsvButton } from '../../../components/ExportCsvButton';
import { useCohorts } from '../../cohorts/hooks/useCohorts';
import { useModules } from '../../modules/hooks/useModules';
import { useAcademicPerformanceReport } from '../hooks/useReports';
import { useConfig } from '../../../contexts/ConfigContext';

// `mode` picks a default sort so "Good Scores" (desc, best first) and
// "Poor Performance" (asc, worst first) actually differ from the plain
// "Overview"/"Class Wise" listing — previously all four Academics sub-tabs
// rendered this exact same, unsorted component.
export function AcademicPerformanceTab({ mode = 'all' }) {
  const { t } = useConfig();
  const { data: cohorts } = useCohorts();
  const { data: modules } = useModules();
  const [cohortId, setCohortId] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState(
    mode === 'good' ? { key: 'avg', dir: 'desc' } : mode === 'poor' ? { key: 'avg', dir: 'asc' } : null
  );
  const { data: rows, isLoading, error } = useAcademicPerformanceReport({
    cohort_id: cohortId || undefined,
    module_id: moduleId || undefined
  });

  const columns = [
    { key: 'learner', header: 'Learner', sortable: true, sortValue: (row) => `${row.first_name} ${row.last_name}`, render: (row) => `${row.first_name} ${row.last_name}` },
    { key: 'cohort', header: t('cohort'), sortable: true, sortValue: (row) => row.cohort_name, render: (row) => row.cohort_name },
    { key: 'taken', header: 'Evaluations Taken', sortable: true, sortValue: (row) => Number(row.evaluations_taken), render: (row) => row.evaluations_taken },
    { key: 'avg', header: 'Average', sortable: true, sortValue: (row) => (row.avg_percentage != null ? Number(row.avg_percentage) : -1), render: (row) => (row.avg_percentage != null ? `${row.avg_percentage}%` : '—') }
  ];

  const filtered = (rows || []).filter((row) =>
    !search || `${row.first_name} ${row.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  // DataTable skips its own client-side sort once onSortChange is passed
  // (controlled mode — see DataTable.jsx's doc comment), so the sorted
  // order has to be computed here to get a mode-driven default sort at
  // all (uncontrolled mode always starts at null, ignoring any prop).
  const sorted = (() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = col.sortValue(a);
      const bv = col.sortValue(b);
      if (typeof av === 'number' && typeof bv === 'number') return av - bv;
      return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' });
    });
    if (sort.dir === 'desc') copy.reverse();
    return copy;
  })();

  const csvColumns = [
    { header: 'Learner', value: (r) => `${r.first_name} ${r.last_name}` },
    { header: 'Cohort', value: (r) => r.cohort_name },
    { header: 'Evaluations Taken', value: (r) => r.evaluations_taken },
    { header: 'Average %', value: (r) => r.avg_percentage ?? '' }
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold text-ink-700">
            {t('cohort')}
            <select className="input ml-2" value={cohortId} onChange={(e) => setCohortId(e.target.value)}>
              <option value="">All cohorts</option>
              {(cohorts || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-ink-700">
            {t('topic')}
            <select className="input ml-2" value={moduleId} onChange={(e) => setModuleId(e.target.value)}>
              <option value="">All subjects</option>
              {(modules || []).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </label>
          <input
            type="search"
            placeholder="Search learner…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-48"
          />
        </div>
        <ExportCsvButton filename="academic-performance" columns={csvColumns} rows={sorted} />
      </div>
      <div className="overflow-hidden bg-surface md:rounded border-0 md:border border-border -mx-4 md:mx-0">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}
        {rows && (
          <DataTable
            columns={columns}
            rows={sorted}
            rowKey={(row) => row.learner_id}
            emptyMessage="No evaluation scores recorded yet."
            sort={sort}
            onSortChange={(key) => {
              setSort((prev) => {
                if (!prev || prev.key !== key) return { key, dir: 'asc' };
                if (prev.dir === 'asc') return { key, dir: 'desc' };
                return null;
              });
            }}
          />
        )}
      </div>
    </div>
  );
}
