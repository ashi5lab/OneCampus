import { useState } from 'react';
import { DataTable } from '../../../components/DataTable';
import { ExportCsvButton } from '../../../components/ExportCsvButton';
import { useAssignmentsReport } from '../hooks/useReports';
import { useConfig } from '../../../contexts/ConfigContext';

export function AssignmentsTab() {
  const { t } = useConfig();
  const { data: rows, isLoading, error } = useAssignmentsReport();
  const [search, setSearch] = useState('');

  const filtered = (rows || []).filter((row) => !search || row.title?.toLowerCase().includes(search.toLowerCase()));

  const columns = [
    { key: 'title', header: 'Title', sortable: true, render: (row) => row.title },
    { key: 'module', header: t('topic'), sortable: true, sortValue: (row) => row.module_name, render: (row) => row.module_name },
    { key: 'cohort', header: t('cohort'), sortable: true, sortValue: (row) => row.cohort_name, render: (row) => row.cohort_name },
    { key: 'due', header: 'Due', sortable: true, sortValue: (row) => row.due_date, render: (row) => new Date(row.due_date).toLocaleDateString() },
    { key: 'submissions', header: 'Submissions', render: (row) => `${row.submissions_count} / ${row.cohort_size}` },
    { key: 'completion', header: 'Completion', sortable: true, sortValue: (row) => row.completion_rate ?? -1, render: (row) => (row.completion_rate != null ? `${row.completion_rate}%` : '—') },
    { key: 'avg', header: 'Avg Score', render: (row) => (row.avg_score != null ? `${row.avg_score} / ${row.max_score}` : '—') }
  ];

  const csvColumns = [
    { header: 'Title', value: (r) => r.title },
    { header: t('topic'), value: (r) => r.module_name },
    { header: t('cohort'), value: (r) => r.cohort_name },
    { header: 'Due', value: (r) => r.due_date },
    { header: 'Submissions', value: (r) => `${r.submissions_count} / ${r.cohort_size}` },
    { header: 'Completion %', value: (r) => r.completion_rate ?? '' },
    { header: 'Avg Score', value: (r) => (r.avg_score != null ? `${r.avg_score} / ${r.max_score}` : '') }
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          placeholder="Search assignment…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input w-56"
        />
        <ExportCsvButton filename="assignments-report" columns={csvColumns} rows={filtered} />
      </div>
      <div className="overflow-hidden bg-surface md:rounded border-0 md:border border-border -mx-4 md:mx-0">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}
        {rows && <DataTable columns={columns} rows={filtered} rowKey={(row) => row.id} emptyMessage="No assignments posted yet." />}
      </div>
    </div>
  );
}
