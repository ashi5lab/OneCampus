import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { DataTable } from '../../../components/DataTable';
import { useAuth } from '../../../contexts/AuthContext';
import { useEvaluations, useCreateEvaluation, useUpdateEvaluation, useDeleteEvaluation } from '../hooks/useEvaluations';
import { EvaluationFormModal } from './EvaluationFormModal';

export function EvaluationsPage() {
  const { can, user } = useAuth();
  const { data: evaluations, isLoading, error } = useEvaluations();
  const createEvaluation = useCreateEvaluation();
  const updateEvaluation = useUpdateEvaluation();
  const deleteEvaluation = useDeleteEvaluation();
  const [showForm, setShowForm] = useState(false);
  const [editingEval, setEditingEval] = useState(null);

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <Link to={`/app/evaluations/${row.id}`} className="font-semibold text-accent-dark hover:underline">
          {row.name}
        </Link>
      )
    },
    { key: 'type', header: 'Type', mobileCompact: true, render: (row) => row.type },
    { key: 'time_block', header: 'Term', mobileCompact: true, render: (row) => row.time_block }
  ];

  function evaluationActions(row) {
    const canManage = can('evaluations.manage') || row.created_by === user.id;
    return [
      { key: 'edit', label: 'Edit', icon: Pencil, hidden: !canManage, onClick: () => setEditingEval(row) },
      {
        key: 'delete',
        label: 'Delete',
        icon: Trash2,
        variant: 'danger',
        hidden: !canManage,
        confirm: `Delete "${row.name}"?`,
        onClick: () => deleteEvaluation.mutate(row.id)
      }
    ];
  }

  return (
    <div>
      {can('evaluations.manage') && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setShowForm(true)}
            className="rounded-full bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
          >
            + Add Evaluation
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded border border-border bg-surface">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && (
          <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>
        )}
        {evaluations && <DataTable columns={columns} rows={evaluations} rowKey={(row) => row.id} mobileCompact actions={evaluationActions} />}
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

      {editingEval && (
        <EvaluationFormModal
          initialData={editingEval}
          onClose={() => setEditingEval(null)}
          submitting={updateEvaluation.isPending}
          submitError={updateEvaluation.error?.message}
          onSubmit={(values) =>
            updateEvaluation.mutate(
              { id: editingEval.id, payload: values },
              { onSuccess: () => setEditingEval(null) }
            )
          }
        />
      )}
    </div>
  );
}
