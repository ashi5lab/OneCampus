import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useConfig } from '../../../contexts/ConfigContext';
import { StatCard } from '../../../components/StatCard';
import { DataTable } from '../../../components/DataTable';
import { useAssignments, useCreateAssignment, useUpdateAssignment, useDeleteAssignment } from '../hooks/useAssignments';
import { AssignmentFormModal } from './AssignmentFormModal';

export function AssignmentsPage() {
  const { can } = useAuth();
  const { t } = useConfig();
  const { data: assignments, isLoading, error } = useAssignments();
  const createAssignment = useCreateAssignment();
  const updateAssignment = useUpdateAssignment();
  const deleteAssignment = useDeleteAssignment();

  const [showForm, setShowForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);

  const columns = [
    {
      key: 'title',
      header: 'Title',
      render: (row) => (
        <Link to={`/app/assignments/${row.id}`} className="font-semibold text-accent-dark hover:underline">
          {row.title}
        </Link>
      )
    },
    { key: 'module', header: t('topic'), render: (row) => row.module_name },
    { key: 'cohort', header: t('cohort'), render: (row) => row.cohort_name },
    { key: 'due_date', header: 'Due', render: (row) => new Date(row.due_date).toLocaleDateString() }
  ];
  if (can('assignments.manage')) {
    columns.push({
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex justify-end gap-3">
          <button onClick={() => setEditingAssignment(row)} className="text-xs font-semibold text-ink-500 hover:text-ink-900">
            Edit
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Delete "${row.title}"?`)) deleteAssignment.mutate(row.id);
            }}
            className="text-xs font-semibold text-danger hover:opacity-80"
          >
            Delete
          </button>
        </div>
      )
    });
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">Assignments</div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">Homework &amp; Assignments</h1>
        </div>
        {can('assignments.manage') && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
          >
            + Post Assignment
          </button>
        )}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Assignments" value={isLoading ? '—' : assignments.length} />
      </div>

      <div className="overflow-hidden rounded border border-border bg-surface">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}
        {assignments && (
          <DataTable columns={columns} rows={assignments} rowKey={(row) => row.id} emptyMessage="No assignments posted yet." />
        )}
      </div>

      {showForm && (
        <AssignmentFormModal
          onClose={() => setShowForm(false)}
          submitting={createAssignment.isPending}
          submitError={createAssignment.error?.message}
          onSubmit={(values) => createAssignment.mutate(values, { onSuccess: () => setShowForm(false) })}
        />
      )}

      {editingAssignment && (
        <AssignmentFormModal
          initialData={editingAssignment}
          onClose={() => setEditingAssignment(null)}
          submitting={updateAssignment.isPending}
          submitError={updateAssignment.error?.message}
          onSubmit={(values) =>
            updateAssignment.mutate({ id: editingAssignment.id, payload: values }, { onSuccess: () => setEditingAssignment(null) })
          }
        />
      )}
    </div>
  );
}
