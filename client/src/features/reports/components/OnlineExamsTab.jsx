import { DataTable } from '../../../components/DataTable';
import { Badge } from '../../../components/Badge';
import { useOnlineExamsReport } from '../hooks/useReports';
import { useConfig } from '../../../contexts/ConfigContext';

export function OnlineExamsTab() {
  const { t } = useConfig();
  const { data: rows, isLoading, error } = useOnlineExamsReport();

  const columns = [
    { key: 'title', header: 'Title', render: (row) => row.title },
    { key: 'module', header: t('topic'), render: (row) => row.module_name },
    { key: 'cohort', header: t('cohort'), render: (row) => row.cohort_name },
    { key: 'grading', header: 'Grading', render: (row) => (row.grading_type === 'auto' ? 'Automatic' : 'Manual') },
    {
      key: 'published',
      header: 'Published',
      render: (row) => <Badge variant={row.published ? 'active' : 'pending'}>{row.published ? 'Yes' : 'No'}</Badge>
    },
    { key: 'submitted', header: 'Submitted', render: (row) => `${row.submitted_count} / ${row.cohort_size}` },
    { key: 'graded', header: 'Graded', render: (row) => row.graded_count },
    { key: 'avg', header: 'Avg Score', render: (row) => (row.avg_score != null ? `${row.avg_score} / ${row.max_score}` : '—') },
    { key: 'pass', header: 'Pass Rate', render: (row) => (row.pass_rate != null ? `${row.pass_rate}%` : '—') }
  ];

  return (
    <div className="overflow-hidden rounded border border-border bg-surface">
      {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
      {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}
      {rows && <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} emptyMessage="No exams created yet." />}
    </div>
  );
}
