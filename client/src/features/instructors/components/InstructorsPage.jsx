import { useState } from 'react';
import { useConfig } from '../../../contexts/ConfigContext';
import { useAuth } from '../../../contexts/AuthContext';
import { StatCard } from '../../../components/StatCard';
import { DataTable } from '../../../components/DataTable';
import { useInstructors, useCreateInstructor, useUpdateInstructor, useDeleteInstructor } from '../hooks/useInstructors';
import { InstructorFormModal } from './InstructorFormModal';

export function InstructorsPage() {
  const { t } = useConfig();
  const { can } = useAuth();
  const { data: instructors, isLoading, error } = useInstructors();
  const createInstructor = useCreateInstructor();
  const updateInstructor = useUpdateInstructor();
  const deleteInstructor = useDeleteInstructor();
  
  const [showForm, setShowForm] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState(null);

  const columns = [
    {
      key: 'name',
      header: t('instructor'),
      render: (row) => (
        <div>
          <div className="font-semibold">{row.first_name} {row.last_name}</div>
          <div className="font-mono text-[11.5px] text-ink-500">{row.staff_id}</div>
        </div>
      )
    },
    { key: 'phone', header: 'Phone', render: (row) => row.phone || '—' }
  ];

  if (can('instructors.manage')) {
    columns.push({
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex justify-end gap-3">
          <button onClick={() => setEditingInstructor(row)} className="text-xs font-semibold text-ink-500 hover:text-ink-900">Edit</button>
          <button 
            onClick={() => {
              if (window.confirm(`Are you sure you want to delete ${row.first_name} ${row.last_name}?`)) {
                deleteInstructor.mutate(row.id);
              }
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
          <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">
            Management / {t('instructors')}
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">
            {t('instructors')}
          </h1>
        </div>
        {can('instructors.manage') && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
          >
            + Add {t('instructor')}
          </button>
        )}
      </div>

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard label={`Total ${t('instructors')}`} value={isLoading ? '—' : instructors.length} />
      </div>

      <div className="overflow-hidden rounded border border-border bg-surface">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && (
          <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>
        )}
        {instructors && (
          <DataTable columns={columns} rows={instructors} rowKey={(row) => row.id} />
        )}
      </div>

      {showForm && (
        <InstructorFormModal
          onClose={() => setShowForm(false)}
          submitting={createInstructor.isPending}
          submitError={createInstructor.error?.message}
          onSubmit={(values) =>
            createInstructor.mutate(values, { onSuccess: () => setShowForm(false) })
          }
        />
      )}

      {editingInstructor && (
        <InstructorFormModal
          initialData={editingInstructor}
          onClose={() => setEditingInstructor(null)}
          submitting={updateInstructor.isPending}
          submitError={updateInstructor.error?.message}
          onSubmit={(values) =>
            updateInstructor.mutate({ id: editingInstructor.id, payload: values }, { onSuccess: () => setEditingInstructor(null) })
          }
        />
      )}
    </div>
  );
}
