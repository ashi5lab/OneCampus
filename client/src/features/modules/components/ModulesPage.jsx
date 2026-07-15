import { useState } from 'react';
import { useConfig } from '../../../contexts/ConfigContext';
import { useAuth } from '../../../contexts/AuthContext';
import { StatCard } from '../../../components/StatCard';
import { DataTable } from '../../../components/DataTable';
import { useUnits } from '../../units/hooks/useUnits';
import { useModules, useCreateModule } from '../hooks/useModules';
import { ModuleFormModal } from './ModuleFormModal';

export function ModulesPage() {
  const { t } = useConfig();
  const { can } = useAuth();
  const { data: modules, isLoading, error } = useModules();
  const { data: units } = useUnits({ enabled: can('units.view') });
  const createModule = useCreateModule();
  const [showForm, setShowForm] = useState(false);

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

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">
            Management / {t('topics')}
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">{t('topics')}</h1>
        </div>
        {can('modules.manage') && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
          >
            + Add {t('topic')}
          </button>
        )}
      </div>

      <div className="mb-6 grid grid-cols-4 gap-3.5">
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
    </div>
  );
}
