import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSuperAdminAuth } from '../../../contexts/SuperAdminAuthContext';
import { Badge } from '../../../components/Badge';
import {
  useSuperAdminTenants,
  useApproveTenant,
  useDeclineTenant,
  useDeleteTenant
} from '../hooks/useSuperAdminTenants';
import { TenantEditModal } from './TenantEditModal';

const STATUS_TABS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'declined', label: 'Declined' },
  { value: '', label: 'All' }
];

const STATUS_BADGE_VARIANT = { approved: 'active', pending: 'pending', declined: 'inactive' };

export function SuperAdminDashboardPage() {
  const { admin, logout } = useSuperAdminAuth();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [editingTenant, setEditingTenant] = useState(null);

  const { data: tenants, isLoading, error } = useSuperAdminTenants(statusFilter);
  const approveTenant = useApproveTenant();
  const declineTenant = useDeclineTenant();
  const deleteTenant = useDeleteTenant();

  function handleLogout() {
    logout();
    navigate('/super-admin/login', { replace: true });
  }

  function handleApprove(tenant) {
    if (!window.confirm(`Approve ${tenant.org_name}? This creates their schema and admin login immediately.`)) return;
    approveTenant.mutate(tenant.id);
  }

  function handleDecline(tenant) {
    const reason = window.prompt(`Decline ${tenant.org_name}? Optionally give a reason:`, '');
    if (reason === null) return;
    declineTenant.mutate({ id: tenant.id, reason: reason || undefined });
  }

  function handleDelete(tenant) {
    const warning = tenant.provisioned_at
      ? `Delete ${tenant.org_name}? This permanently drops their schema and ALL data. This cannot be undone.`
      : `Delete the registration for ${tenant.org_name}? This cannot be undone.`;
    if (!window.confirm(warning)) return;
    deleteTenant.mutate(tenant.id);
  }

  return (
    <div className="min-h-screen bg-bg font-body">
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 sm:px-6">
        <div>
          <div className="text-[15px] font-semibold text-ink-900">Super Admin</div>
          <div className="text-[11px] text-ink-500">{admin?.username}</div>
        </div>
        <button onClick={handleLogout} className="text-xs font-semibold text-ink-500 hover:text-ink-900">
          Log out
        </button>
      </div>

      <div className="mx-auto w-full max-w-[900px] px-4 py-5 sm:px-6 sm:py-7">
        <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">Tenants</div>
        <h1 className="mb-5 font-display text-2xl font-bold tracking-tight text-ink-900">Manage Tenants</h1>

        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                statusFilter === tab.value ? 'bg-ink-900 text-white' : 'border border-border bg-surface text-ink-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}

        {tenants && tenants.length === 0 && (
          <div className="rounded border border-border bg-surface p-8 text-center text-sm text-ink-500">
            No tenants in this view.
          </div>
        )}

        <div className="space-y-3">
          {(tenants || []).map((tenant) => (
            <div key={tenant.id} className="rounded-xl border border-border bg-surface p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-[15px] font-semibold text-ink-900">{tenant.org_name}</div>
                    <Badge variant={STATUS_BADGE_VARIANT[tenant.status] || 'pending'}>{tenant.status}</Badge>
                    {tenant.status === 'approved' && !tenant.is_active && <Badge variant="inactive">disabled</Badge>}
                  </div>
                  <div className="mt-0.5 text-[12.5px] text-ink-500">
                    {tenant.domain} &middot; {tenant.org_type}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1 text-[12.5px] text-ink-700 sm:grid-cols-2">
                <div>Contact: {tenant.contact_name || '—'}</div>
                <div>Phone: {tenant.contact_phone || '—'}</div>
                <div className="sm:col-span-2">Email: {tenant.contact_email || '—'}</div>
                <div>Admin username: {tenant.admin_username || '—'}</div>
              </div>

              {tenant.status === 'declined' && tenant.decline_reason && (
                <div className="mt-2 text-[12px] font-semibold text-danger">Reason: {tenant.decline_reason}</div>
              )}

              <div className="mt-3 flex flex-wrap gap-4 border-t border-border pt-3">
                {tenant.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApprove(tenant)}
                      disabled={approveTenant.isPending}
                      className="text-xs font-semibold text-success hover:opacity-80 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleDecline(tenant)}
                      disabled={declineTenant.isPending}
                      className="text-xs font-semibold text-danger hover:opacity-80 disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </>
                )}
                {tenant.status === 'approved' && (
                  <button
                    onClick={() => setEditingTenant(tenant)}
                    className="text-xs font-semibold text-ink-500 hover:text-ink-900"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={() => handleDelete(tenant)}
                  disabled={deleteTenant.isPending}
                  className="text-xs font-semibold text-danger hover:opacity-80 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingTenant && <TenantEditModal tenant={editingTenant} onClose={() => setEditingTenant(null)} />}
    </div>
  );
}
