import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { StatCard } from '../../../components/StatCard';
import { DataTable } from '../../../components/DataTable';
import { PageHeader } from '../../../components/PageHeader';
import { useUnits, useCreateUnit, useUpdateUnit, useDeleteUnit } from '../hooks/useUnits';
import { UnitFormModal } from './UnitFormModal';

export function UnitsPage() {
  const { can } = useAuth();
  const { data: units, isLoading, error } = useUnits();
  const createUnit = useCreateUnit();
  const updateUnit = useUpdateUnit();
  const deleteUnit = useDeleteUnit();
  
  const [showForm, setShowForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);

  const columns = [
    { key: 'name', header: 'Name', sortable: true, render: (row) => <span className="font-semibold">{row.name}</span> },
    { key: 'type', header: 'Type', sortable: true, mobileCompact: true, render: (row) => row.type }
  ];

  function unitActions(row) {
    return [
      { key: 'edit', label: 'Edit', icon: Pencil, hidden: !can('units.manage'), onClick: () => setEditingUnit(row) },
      {
        key: 'delete',
        label: 'Delete',
        icon: Trash2,
        variant: 'danger',
        hidden: !can('units.manage'),
        confirm: `Are you sure you want to delete ${row.name}?`,
        onClick: () => deleteUnit.mutate(row.id)
      }
    ];
  }

  return (
    <div>
      <PageHeader
        eyebrow="Management / Units"
        title="Units"
        actions={
          can('units.manage') && (
            <button
              onClick={() => setShowForm(true)}
              className="rounded-full bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
            >
              + Add Unit
            </button>
          )
        }
      />

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard label="Total Units" value={isLoading ? '—' : units.length} />
      </div>

      <div className="overflow-hidden rounded border border-border bg-surface">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && (
          <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>
        )}
        {units && <DataTable columns={columns} rows={units} rowKey={(row) => row.id} mobileCompact actions={unitActions} />}
      </div>

      {showForm && (
        <UnitFormModal
          onClose={() => setShowForm(false)}
          submitting={createUnit.isPending}
          submitError={createUnit.error?.message}
          onSubmit={(values) =>
            createUnit.mutate(values, { onSuccess: () => setShowForm(false) })
          }
        />
      )}

      {editingUnit && (
        <UnitFormModal
          initialData={editingUnit}
          onClose={() => setEditingUnit(null)}
          submitting={updateUnit.isPending}
          submitError={updateUnit.error?.message}
          onSubmit={(values) =>
            updateUnit.mutate({ id: editingUnit.id, payload: values }, { onSuccess: () => setEditingUnit(null) })
          }
        />
      )}
    </div>
  );
}
