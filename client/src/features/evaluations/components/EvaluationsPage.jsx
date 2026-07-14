import { DataTable } from '../../../components/DataTable';
import { useEvaluations } from '../hooks/useEvaluations';

export function EvaluationsPage() {
  const { data: evaluations, isLoading, error } = useEvaluations();

  const columns = [
    { key: 'name', header: 'Name', render: (row) => <span className="font-semibold">{row.name}</span> },
    { key: 'type', header: 'Type', render: (row) => row.type },
    { key: 'time_block', header: 'Term', render: (row) => row.time_block }
  ];

  return (
    <div>
      <div className="mb-6">
        <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">
          Management / Exams
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">Exams</h1>
      </div>

      <div className="overflow-hidden rounded border border-border bg-surface">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && (
          <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>
        )}
        {evaluations && <DataTable columns={columns} rows={evaluations} rowKey={(row) => row.id} />}
      </div>
    </div>
  );
}
