import { Link, useNavigate } from 'react-router-dom';
import { DataTable } from '../../../components/DataTable';
import { Badge } from '../../../components/Badge';
import { PageHeader } from '../../../components/PageHeader';
import { useAccessGroups, useDeleteAccessGroup } from '../hooks/useAccessControl';

export function AccessControlPage() {
  const { data: groups, isLoading, error } = useAccessGroups();
  const deleteGroup = useDeleteAccessGroup();
  const navigate = useNavigate();

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
          <Link to={`/app/access-control/${row.id}`} className="text-xs font-semibold text-ink-500 hover:text-ink-900">
            Edit
          </Link>
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
    <div className="max-w-[1000px]">
      <PageHeader
        eyebrow="Settings"
        title="Access Control"
        actions={
          <Link
            to="/app/access-control/new"
            className="rounded-full bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
          >
            + Create Access Group
          </Link>
        }
      />
      <p className="mb-4 text-[13px] text-ink-500">
        Grant extra permissions on top of a role's defaults — to every user of a role, or to specific users.
      </p>

      <div className="overflow-hidden rounded border border-border bg-surface">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}
        {groups && (
          <DataTable columns={columns} rows={groups} rowKey={(row) => row.id} emptyMessage="No access groups yet — every role uses just its default permissions." />
        )}
      </div>
    </div>
  );
}
