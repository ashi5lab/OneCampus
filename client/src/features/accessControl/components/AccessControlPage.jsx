import { useState } from 'react';
import { DataTable } from '../../../components/DataTable';
import { Badge } from '../../../components/Badge';
import { useAccessGroups, useDeleteAccessGroup } from '../hooks/useAccessControl';
import { AccessGroupFormModal } from './AccessGroupFormModal';

export function AccessControlPage() {
  const { data: groups, isLoading, error } = useAccessGroups();
  const deleteGroup = useDeleteAccessGroup();
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <div>
          <div className="font-semibold">{row.name}</div>
          {row.description && <div className="text-[11.5px] text-ink-500">{row.description}</div>}
        </div>
      )
    },
    {
      key: 'applies_to',
      header: 'Applies To',
      render: (row) =>
        row.target_type === 'role' ? (
          <Badge variant="pending">Role: {row.target_role}</Badge>
        ) : (
          <span className="text-[12.5px] text-ink-700">
            {row.members.length === 0 ? 'No users' : row.members.map((m) => m.username).join(', ')}
          </span>
        )
    },
    {
      key: 'permissions',
      header: 'Permissions',
      render: (row) => <span className="text-[12.5px] text-ink-700">{row.permissions.length} granted</span>
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex justify-end gap-3">
          <button onClick={() => setEditingGroup(row)} className="text-xs font-semibold text-ink-500 hover:text-ink-900">
            Edit
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Delete access group "${row.name}"?`)) deleteGroup.mutate(row.id);
            }}
            className="text-xs font-semibold text-danger hover:opacity-80"
          >
            Delete
          </button>
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">Access Control</div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">Access Control</h1>
          <p className="mt-1 text-[13px] text-ink-500">
            Grant extra permissions on top of a role's defaults — to every user of a role, or to specific users.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="rounded bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
        >
          + Create Access Group
        </button>
      </div>

      <div className="overflow-hidden rounded border border-border bg-surface">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}
        {groups && (
          <DataTable columns={columns} rows={groups} rowKey={(row) => row.id} emptyMessage="No access groups yet — every role uses just its default permissions." />
        )}
      </div>

      {showForm && <AccessGroupFormModal onClose={() => setShowForm(false)} />}
      {editingGroup && <AccessGroupFormModal initialData={editingGroup} onClose={() => setEditingGroup(null)} />}
    </div>
  );
}
