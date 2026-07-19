import { useState } from 'react';
import { useConfig } from '../../../contexts/ConfigContext';
import { useAuth } from '../../../contexts/AuthContext';
import { StatCard } from '../../../components/StatCard';
import { DataTable } from '../../../components/DataTable';
import { Badge } from '../../../components/Badge';
import { Avatar } from '../../../components/Avatar';
import { useGuardians, useCreateGuardian, useUpdateGuardian, useDeleteGuardian } from '../hooks/useGuardians';
import { useGuardianLinks } from '../hooks/useGuardianLinks';
import { useLearners } from '../../learners/hooks/useLearners';
import { GuardianFormModal } from './GuardianFormModal';
import { GuardianLinksModal } from './GuardianLinksModal';

export function GuardiansPage() {
  const { t } = useConfig();
  const { can } = useAuth();
  const { data: guardians, isLoading, error } = useGuardians();
  const createGuardian = useCreateGuardian();
  const updateGuardian = useUpdateGuardian();
  const deleteGuardian = useDeleteGuardian();
  
  const [showForm, setShowForm] = useState(false);
  const [editingGuardian, setEditingGuardian] = useState(null);
  const [linksTarget, setLinksTarget] = useState(null);

  const canManageLinks = can('guardian_links.manage');
  const { data: links } = useGuardianLinks({ enabled: canManageLinks });
  const { data: learners } = useLearners({ enabled: canManageLinks });

  const columns = [
    {
      key: 'name',
      header: 'Guardian',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={`${row.first_name} ${row.last_name}`} src={row.profile_picture_url} size={32} />
          <div>
            <div className="font-semibold">{row.first_name} {row.last_name}</div>
            <div className="font-mono text-[11.5px] text-ink-500">{row.phone}</div>
          </div>
        </div>
      )
    },
    { key: 'address', header: 'Address', render: (row) => row.address },
    {
      key: 'whatsapp',
      header: 'WhatsApp',
      render: (row) => <Badge variant={row.whatsapp_opt_in ? 'active' : 'inactive'}>{row.whatsapp_opt_in ? 'Opted in' : 'Not opted in'}</Badge>
    }
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
              className="whitespace-nowrap text-[11.5px] font-semibold text-accent hover:opacity-80"
            >
              Manage
            </button>
          </div>
        );
      }
    });
  }

  if (can('guardians.manage')) {
    columns.push({
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex justify-end gap-3">
          <button onClick={() => setEditingGuardian(row)} className="text-xs font-semibold text-ink-500 hover:text-ink-900">Edit</button>
          <button 
            onClick={() => {
              if (window.confirm(`Are you sure you want to delete ${row.first_name} ${row.last_name}?`)) {
                deleteGuardian.mutate(row.id);
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
            Management / Guardians
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">Guardians</h1>
        </div>
        {can('guardians.manage') && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-full bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
          >
            + Add Guardian
          </button>
        )}
      </div>

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
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

      {editingGuardian && (
        <GuardianFormModal
          initialData={editingGuardian}
          onClose={() => setEditingGuardian(null)}
          submitting={updateGuardian.isPending}
          submitError={updateGuardian.error?.message}
          onSubmit={(values) =>
            updateGuardian.mutate({ id: editingGuardian.id, payload: values }, { onSuccess: () => setEditingGuardian(null) })
          }
        />
      )}

      {linksTarget && (
        <GuardianLinksModal guardian={linksTarget} onClose={() => setLinksTarget(null)} />
      )}
    </div>
  );
}
