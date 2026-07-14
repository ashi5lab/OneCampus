import { useState } from 'react';
import { useConfig } from '../../../contexts/ConfigContext';
import { StatCard } from '../../../components/StatCard';
import { DataTable } from '../../../components/DataTable';
import { useCohorts, useCreateCohort } from '../hooks/useCohorts';
import { CohortFormModal } from './CohortFormModal';

export function CohortsPage() {
  const { t } = useConfig();
  const { data: cohorts, isLoading, error } = useCohorts();
  const createCohort = useCreateCohort();
  const [showForm, setShowForm] = useState(false);

  const columns = [
    { key: 'name', header: t('cohort'), render: (row) => <span className="font-semibold">{row.name}</span> },
    { key: 'time_block', header: t('term'), render: (row) => row.time_block }
  ];

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">
            Management / {t('cohorts')}
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">
            {t('cohorts')}
          </h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="rounded bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
        >
          + Add {t('cohort')}
        </button>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-3.5">
        <StatCard label={`Total ${t('cohorts')}`} value={isLoading ? '—' : cohorts.length} />
      </div>

      <div className="overflow-hidden rounded border border-border bg-surface">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && (
          <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>
        )}
        {cohorts && <DataTable columns={columns} rows={cohorts} rowKey={(row) => row.id} />}
      </div>

      {showForm && (
        <CohortFormModal
          onClose={() => setShowForm(false)}
          submitting={createCohort.isPending}
          submitError={createCohort.error?.message}
          onSubmit={(values) =>
            createCohort.mutate(values, { onSuccess: () => setShowForm(false) })
          }
        />
      )}
    </div>
  );
}
