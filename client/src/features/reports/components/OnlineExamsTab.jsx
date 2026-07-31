import { useState } from 'react';
import { DataTable } from '../../../components/DataTable';
import { ExportCsvButton } from '../../../components/ExportCsvButton';
import { Badge } from '../../../components/Badge';
import { useOnlineExamsReport } from '../hooks/useReports';
import { useConfig } from '../../../contexts/ConfigContext';

export function OnlineExamsTab() {
  const { t } = useConfig();
  const { data: rows, isLoading, error } = useOnlineExamsReport();
  const [search, setSearch] = useState('');

  const filtered = (rows || []).filter((row) => !search || row.title?.toLowerCase().includes(search.toLowerCase()));

  const columns = [
    { key: 'title', header: 'Title', sortable: true, render: (row) => row.title },
    { key: 'module', header: t('topic'), sortable: true, sortValue: (row) => row.module_name, render: (row) => row.module_name },
    { key: 'cohort', header: t('cohort'), sortable: true, sortValue: (row) => row.cohort_name, render: (row) => row.cohort_name },
    { key: 'grading', header: 'Grading', render: (row) => (row.grading_type === 'auto' ? 'Automatic' : 'Manual') },
    {
      key: 'published',
      header: 'Published',
      render: (row) => <Badge variant={row.published ? 'active' : 'pending'}>{row.published ? 'Yes' : 'No'}</Badge>
    },
    { key: 'submitted', header: 'Submitted', render: (row) => `${row.submitted_count} / ${row.cohort_size}` },
    { key: 'graded', header: 'Graded', render: (row) => row.graded_count },
    { key: 'avg', header: 'Avg Score', render: (row) => (row.avg_score != null ? `${row.avg_score} / ${row.max_score}` : '—') },
    { key: 'pass', header: 'Pass Rate', sortable: true, sortValue: (row) => row.pass_rate ?? -1, render: (row) => (row.pass_rate != null ? `${row.pass_rate}%` : '—') }
  ];

  const csvColumns = [
    { header: 'Title', value: (r) => r.title },
    { header: t('topic'), value: (r) => r.module_name },
    { header: t('cohort'), value: (r) => r.cohort_name },
    { header: 'Grading', value: (r) => (r.grading_type === 'auto' ? 'Automatic' : 'Manual') },
    { header: 'Published', value: (r) => (r.published ? 'Yes' : 'No') },
    { header: 'Submitted', value: (r) => `${r.submitted_count} / ${r.cohort_size}` },
    { header: 'Graded', value: (r) => r.graded_count },
    { header: 'Pass Rate %', value: (r) => r.pass_rate ?? '' }
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          placeholder="Search exam…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input w-56"
        />
        <ExportCsvButton filename="online-exams-report" columns={csvColumns} rows={filtered} />
      </div>
      <div className="overflow-hidden bg-surface md:rounded border-0 md:border border-border -mx-4 md:mx-0">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}
        {rows && <DataTable columns={columns} rows={filtered} rowKey={(row) => row.id} emptyMessage="No exams created yet." />}
      </div>
    </div>
  );
}
