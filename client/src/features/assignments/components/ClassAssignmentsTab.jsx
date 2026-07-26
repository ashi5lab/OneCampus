import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useConfig } from '../../../contexts/ConfigContext';
import { DataTable } from '../../../components/DataTable';
import { useAssignments, useCreateAssignment, useUpdateAssignment, useDeleteAssignment } from '../hooks/useAssignments';
import { useMarkActivityContextViewed } from '../../activities/hooks/useActivities';
import { AssignmentFormModal } from './AssignmentFormModal';
import { showToast } from '../../../lib/toast';

// The Class channel's Assignments tab — the same list as the full
// /app/assignments page (reached from More), just filtered down to this one
// cohort and with the now-redundant Cohort column dropped. A learner's list
// is already server-scoped to their own class, so the filter is a no-op for
// them; for an instructor/admin (who see every class) it's what actually
// narrows things down to "this class only."
export function ClassAssignmentsTab({ cohortId }) {
  const { can } = useAuth();
  const { t } = useConfig();
  const { data, isLoading, error } = useAssignments();
  const assignments = data?.assignments ?? [];
  const createAssignment = useCreateAssignment();
  const updateAssignment = useUpdateAssignment();
  const deleteAssignment = useDeleteAssignment();
  const canManage = can('assignments.manage');

  useMarkActivityContextViewed(`assignments_${cohortId}`);

  const [showForm, setShowForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);

  const scoped = useMemo(() => (assignments || []).filter((a) => a.cohort_id === cohortId), [assignments, cohortId]);

  const columns = [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (row) => (
        <Link to={`/app/assignments/${row.id}`} className="font-semibold text-accent-dark hover:underline">
          {row.title}
        </Link>
      )
    },
    { key: 'module', header: t('topic'), render: (row) => row.module_name },
    { key: 'due_date', header: 'Due', sortable: true, render: (row) => new Date(row.due_date).toLocaleDateString() }
  ];

  function assignmentActions(row) {
    return [
      { key: 'edit', label: 'Edit', icon: Pencil, hidden: !canManage, onClick: () => setEditingAssignment(row) },
      {
        key: 'delete',
        label: 'Delete',
        icon: Trash2,
        variant: 'danger',
        hidden: !canManage,
        confirm: `Delete "${row.title}"? This cannot be undone.`,
        onClick: () => deleteAssignment.mutate(row.id, {
          onSuccess: () => showToast.success('Assignment deleted.'),
          onError: (e) => showToast.error(e.message),
        })
      }
    ];
  }

  return (
    <div>
      {canManage && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setShowForm(true)}
            className="rounded-full bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
          >
            + Post Assignment
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded border border-border bg-surface">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}
        {!isLoading && !error && (
          <DataTable columns={columns} rows={scoped} rowKey={(row) => row.id} emptyMessage="No assignments posted yet." mobileCompact actions={assignmentActions} />
        )}
      </div>

      {/* An instructor/admin managing assignments can already see every
          class from here — this just points at the full page in case they
          want the school-wide view instead of one class at a time. */}
      {canManage && (
        <Link to="/app/assignments" className="mt-3 inline-block text-xs font-semibold text-ink-500 hover:text-ink-900">
          Manage assignments across all classes &rarr;
        </Link>
      )}

      {showForm && (
        <AssignmentFormModal
          initialData={{ cohort_id: cohortId }}
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
