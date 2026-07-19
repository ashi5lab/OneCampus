import { useState } from 'react';
import { useUpdateTenant } from '../hooks/useSuperAdminTenants';

import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
export function TenantEditModal({ tenant, onClose }) {
  useBodyScrollLock();
  const updateTenant = useUpdateTenant();
  const [orgName, setOrgName] = useState(tenant.org_name || '');
  const [contactName, setContactName] = useState(tenant.contact_name || '');
  const [contactEmail, setContactEmail] = useState(tenant.contact_email || '');
  const [contactPhone, setContactPhone] = useState(tenant.contact_phone || '');
  const [isActive, setIsActive] = useState(tenant.is_active !== false);

  function handleSubmit(e) {
    e.preventDefault();
    updateTenant.mutate(
      {
        id: tenant.id,
        payload: {
          org_name: orgName,
          contact_name: contactName,
          contact_email: contactEmail,
          contact_phone: contactPhone,
          is_active: isActive
        }
      },
      { onSuccess: onClose }
    );
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto bg-ink-900/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="my-auto w-full max-w-[420px] rounded border-2 border-accent bg-surface p-6"
      >
        <div className="mb-4 text-base font-bold text-ink-900">Edit {tenant.org_name}</div>

        <Field label="Organization Name">
          <input className="input" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
        </Field>
        <Field label="Contact Name">
          <input className="input" value={contactName} onChange={(e) => setContactName(e.target.value)} />
        </Field>
        <Field label="Contact Email">
          <input
            type="email"
            className="input"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />
        </Field>
        <Field label="Contact Phone">
          <input
            type="tel"
            className="input"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
          />
        </Field>
        <label className="mb-3 flex items-center gap-2 text-xs font-semibold text-ink-700">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active (unchecking blocks login without deleting the tenant)
        </label>

        {updateTenant.error && (
          <div className="mb-3 text-xs font-semibold text-danger">{updateTenant.error.message}</div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-border px-3.5 py-2 text-xs font-semibold text-ink-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updateTenant.isPending}
            className="rounded bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60"
          >
            {updateTenant.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="mb-3 block">
      <div className="mb-1 text-xs font-semibold text-ink-700">{label}</div>
      {children}
    </label>
  );
}
