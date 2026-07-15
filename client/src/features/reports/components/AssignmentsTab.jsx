import { DataTable } from '../../../components/DataTable';
import { useAssignmentsReport } from '../hooks/useReports';
import { useConfig } from '../../../contexts/ConfigContext';

export function AssignmentsTab() {
  const { t } = useConfig();
  const { data: rows, isLoading, error } = useAssignmentsReport();

  const columns = [
    { key: 'title', header: 'Title', render: (row) => row.title },
    { key: 'module', header: t('topic'), render: (row) => row.module_name },
    { key: 'cohort', header: t('cohort'), render: (row) => row.cohort_name },
    { key: 'due', header: 'Due', render: (row) => new Date(row.due_date).toLocaleDateString() },
    { key: 'submissions', header: 'Submissions', render: (row) => `${row.submissions_count} / ${row.cohort_size}` },
    { key: 'completion', header: 'Completion', render: (row) => (row.completion_rate != null ? `${row.completion_rate}%` : '—') },
    { key: 'avg', header: 'Avg Score', render: (row) => (row.avg_score != null ? `${row.avg_score} / ${row.max_score}` : '—') }
  ];

  return (
    <div className="overflow-hidden rounded border border-border bg-surface">
      {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
      {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}
      {rows && <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} emptyMessage="No assignments posted yet." />}
    </div>
  );
}
