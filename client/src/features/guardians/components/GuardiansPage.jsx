import { useState } from 'react';
import { useConfig } from '../../../contexts/ConfigContext';
import { useAuth } from '../../../contexts/AuthContext';
import { StatCard } from '../../../components/StatCard';
import { DataTable } from '../../../components/DataTable';
import { useGuardians, useCreateGuardian } from '../hooks/useGuardians';
import { useGuardianLinks } from '../hooks/useGuardianLinks';
import { useLearners } from '../../learners/hooks/useLearners';
import { GuardianFormModal } from './GuardianFormModal';
import { GuardianLinksModal } from './GuardianLinksModal';

export function GuardiansPage() {
  const { t } = useConfig();
  const { can } = useAuth();
  const { data: guardians, isLoading, error } = useGuardians();
  const createGuardian = useCreateGuardian();
  const [showForm, setShowForm] = useState(false);
  const [linksTarget, setLinksTarget] = useState(null);

  const canManageLinks = can('guardian_links.manage');
  const { data: links } = useGuardianLinks({ enabled: canManageLinks });
  const { data: learners } = useLearners({ enabled: canManageLinks });

  const columns = [
    {
      key: 'name',
      header: 'Guardian',
      render: (row) => (
        <div>
          <div className="font-semibold">{row.first_name} {row.last_name}</div>
          <div className="font-mono text-[11.5px] text-ink-500">{row.phone}</div>
        </div>
      )
    },
    { key: 'address', header: 'Address', render: (row) => row.address }
  ];

  if (canManageLinks) {
    columns.push({
      key: 'linkedLearners',
      header: 'Linked Learners',
      render: (row) => {
        const linkedIds = (links || [])
          .filter((link) => link.guardian_id === row.id)
          .map((link) => link.learner_id);
        const names = (learners || [])
          .filter((learner) => linkedIds.includes(learner.id))
          .map((learner) => `${learner.first_name} ${learner.last_name}`);
        return (
          <div className="flex items-center gap-2">
            <span className="text-[12.5px] text-ink-500">
              {names.length > 0 ? names.join(', ') : 'None'}
            </span>
            <button
              onClick={() => setLinksTarget(row)}
              className="whitespace-nowrap text-[11.5px] font-semibold text-accent"
            >
              Manage
            </button>
          </div>
        );
      }
    });
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">
            Management / Guardians
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">Guardians</h1>
        </div>
        {can('guardians.manage') && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
          >
            + Add Guardian
          </button>
        )}
      </div>

      <div className="mb-6 grid grid-cols-4 gap-3.5">
        <StatCard label="Total Guardians" value={isLoading ? '—' : guardians.length} />
      </div>

      <div className="overflow-hidden rounded border border-border bg-surface">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && (
          <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>
        )}
        {guardians && <DataTable columns={columns} rows={guardians} rowKey={(row) => row.id} />}
      </div>

      {showForm && (
        <GuardianFormModal
          onClose={() => setShowForm(false)}
          submitting={createGuardian.isPending}
          submitError={createGuardian.error?.message}
          onSubmit={(values) =>
            createGuardian.mutate(values, { onSuccess: () => setShowForm(false) })
          }
        />
      )}

      {linksTarget && (
        <GuardianLinksModal guardian={linksTarget} onClose={() => setLinksTarget(null)} />
      )}
    </div>
  );
}
