import { useState } from 'react';
import { useConfig } from '../../../contexts/ConfigContext';
import { useAuth } from '../../../contexts/AuthContext';
import { StatCard } from '../../../components/StatCard';
import { DataTable } from '../../../components/DataTable';
import { PageHeader } from '../../../components/PageHeader';
import { useUnits } from '../../units/hooks/useUnits';
import { useModules, useCreateModule, useUpdateModule, useDeleteModule } from '../hooks/useModules';
import { ModuleFormModal } from './ModuleFormModal';

export function ModulesPage() {
  const { t } = useConfig();
  const { can } = useAuth();
  const { data: modules, isLoading, error } = useModules();
  const { data: units } = useUnits({ enabled: can('units.view') });
  const createModule = useCreateModule();
  const updateModule = useUpdateModule();
  const deleteModule = useDeleteModule();
  
  const [showForm, setShowForm] = useState(false);
  const [editingModule, setEditingModule] = useState(null);

  function unitName(unitId) {
    if (!unitId) return '—';
    return (units || []).find((unit) => unit.id === unitId)?.name || `#${unitId}`;
  }

  const columns = [
    { key: 'name', header: 'Name', render: (row) => <span className="font-semibold">{row.name}</span> },
    { key: 'code', header: 'Code', render: (row) => <span className="font-mono text-[12.5px]">{row.code}</span> },
    { key: 'unit', header: 'Unit', render: (row) => unitName(row.unit_id) },
    { key: 'credits', header: 'Credits', render: (row) => row.credits }
  ];

  if (can('modules.manage')) {
    columns.push({
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex justify-end gap-3">
          <button onClick={() => setEditingModule(row)} className="text-xs font-semibold text-ink-500 hover:text-ink-900">Edit</button>
          <button 
            onClick={() => {
              if (window.confirm(`Are you sure you want to delete ${row.name}?`)) {
                deleteModule.mutate(row.id);
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
      <PageHeader
        eyebrow={`Management / ${t('topics')}`}
        title={t('topics')}
        actions={
          can('modules.manage') && (
            <button
              onClick={() => setShowForm(true)}
              className="rounded-full bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
            >
              + Add {t('topic')}
            </button>
          )
        }
      />

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard label={`Total ${t('topics')}`} value={isLoading ? '—' : modules.length} />
      </div>

      <div className="overflow-hidden rounded border border-border bg-surface">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && (
          <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>
        )}
        {modules && <DataTable columns={columns} rows={modules} rowKey={(row) => row.id} />}
      </div>

      {showForm && (
        <ModuleFormModal
          onClose={() => setShowForm(false)}
          submitting={createModule.isPending}
          submitError={createModule.error?.message}
          onSubmit={(values) =>
            createModule.mutate(values, { onSuccess: () => setShowForm(false) })
          }
        />
      )}

      {editingModule && (
        <ModuleFormModal
          initialData={editingModule}
          onClose={() => setEditingModule(null)}
          submitting={updateModule.isPending}
          submitError={updateModule.error?.message}
          onSubmit={(values) =>
            updateModule.mutate({ id: editingModule.id, payload: values }, { onSuccess: () => setEditingModule(null) })
          }
        />
      )}
    </div>
  );
}
