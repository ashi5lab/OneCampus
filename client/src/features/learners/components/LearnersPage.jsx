import { useState } from 'react';
import { useConfig } from '../../../contexts/ConfigContext';
import { useAuth } from '../../../contexts/AuthContext';
import { StatCard } from '../../../components/StatCard';
import { DataTable } from '../../../components/DataTable';
import { Badge } from '../../../components/Badge';
import { useLearners, useCreateLearner } from '../hooks/useLearners';
import { LearnerFormModal } from './LearnerFormModal';

const STATUS_VARIANT = { active: 'active', pending: 'pending', inactive: 'inactive' };

function initials(first, last) {
  return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase();
}

export function LearnersPage() {
  const { t } = useConfig();
  const { can } = useAuth();
  const { data: learners, isLoading, error } = useLearners();
  const createLearner = useCreateLearner();
  const [showForm, setShowForm] = useState(false);

  const columns = [
    {
      key: 'name',
      header: t('learner'),
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-border bg-surface-muted text-[11.5px] font-bold text-ink-700">
            {initials(row.first_name, row.last_name)}
          </div>
          <div>
            <div className="font-semibold">{row.first_name} {row.last_name}</div>
            <div className="font-mono text-[11.5px] text-ink-500">{row.registry_no}</div>
          </div>
        </div>
      )
    },
    { key: 'status', header: 'Status', render: (row) => (
      <Badge variant={STATUS_VARIANT[row.status] || 'active'}>{row.status}</Badge>
    ) },
    { key: 'cohort_id', header: t('cohort'), render: (row) => row.cohort_id ?? '—' }
  ];

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">
            Management / {t('learners')}
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">
            {t('learners')}
          </h1>
        </div>
        {can('learners.manage') && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
          >
            + Add {t('learner')}
          </button>
        )}
      </div>

      <div className="mb-6 grid grid-cols-4 gap-3.5">
        <StatCard label={`Total ${t('learners')}`} value={isLoading ? '—' : learners.length} />
      </div>

      <div className="overflow-hidden rounded border border-border bg-surface">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && (
          <div className="p-8 text-center text-sm font-semibold text-danger">
            {error.message}
          </div>
        )}
        {learners && (
          <DataTable columns={columns} rows={learners} rowKey={(row) => row.id} />
        )}
      </div>

      {showForm && (
        <LearnerFormModal
          onClose={() => setShowForm(false)}
          submitting={createLearner.isPending}
          submitError={createLearner.error?.message}
          onSubmit={(values) =>
            createLearner.mutate(values, { onSuccess: () => setShowForm(false) })
          }
        />
      )}
    </div>
  );
}
