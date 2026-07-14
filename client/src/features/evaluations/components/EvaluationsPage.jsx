import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DataTable } from '../../../components/DataTable';
import { useEvaluations, useCreateEvaluation } from '../hooks/useEvaluations';
import { EvaluationFormModal } from './EvaluationFormModal';

export function EvaluationsPage() {
  const { data: evaluations, isLoading, error } = useEvaluations();
  const createEvaluation = useCreateEvaluation();
  const [showForm, setShowForm] = useState(false);

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <Link to={`/evaluations/${row.id}`} className="font-semibold text-accent-dark hover:underline">
          {row.name}
        </Link>
      )
    },
    { key: 'type', header: 'Type', render: (row) => row.type },
    { key: 'time_block', header: 'Term', render: (row) => row.time_block }
  ];

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">
            Management / Exams
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">Exams</h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="rounded bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
        >
          + Add Evaluation
        </button>
      </div>

      <div className="overflow-hidden rounded border border-border bg-surface">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && (
          <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>
        )}
        {evaluations && <DataTable columns={columns} rows={evaluations} rowKey={(row) => row.id} />}
      </div>

      {showForm && (
        <EvaluationFormModal
          onClose={() => setShowForm(false)}
          submitting={createEvaluation.isPending}
          submitError={createEvaluation.error?.message}
          onSubmit={(values) =>
            createEvaluation.mutate(values, { onSuccess: () => setShowForm(false) })
          }
        />
      )}
    </div>
  );
}
