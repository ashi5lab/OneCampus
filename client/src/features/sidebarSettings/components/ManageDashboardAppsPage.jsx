import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useConfig } from '../../../contexts/ConfigContext';
import { useAuth } from '../../../contexts/AuthContext';
import { NAV_LINK_DEFS, DEFAULT_DASHBOARD_APPS } from '../../../lib/sidebarLinks';
import { useUpdateDashboardApps } from '../hooks/useSidebarLinks';

// Tenant-wide: this changes what every user at this organisation sees on
// their Home dashboard, not a personal preference — see useNavLinks.js,
// which combines this list with each individual user's own permission/
// module gates, so toggling something on here never exposes it to a role
// that couldn't already see it. The sidebar/bottom-tab nav itself
// (Dashboard/Students/Classes/More/Settings) is fixed and unaffected —
// everything is still reachable via the More directory regardless.
export function ManageDashboardAppsPage() {
  const { t, hasModule, config, reloadConfig } = useConfig();
  const { can } = useAuth();
  const updateDashboardApps = useUpdateDashboardApps();
  const [selected, setSelected] = useState(config?.dashboard_apps || DEFAULT_DASHBOARD_APPS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSelected(config?.dashboard_apps || DEFAULT_DASHBOARD_APPS);
  }, [config?.dashboard_apps]);

  // Filtered by the viewing admin's own gate — in practice this hides only
  // items gated behind an inactive module (an admin role has every
  // permission by default, so the permission half of each gate rarely
  // excludes anything for them), which is exactly what should be
  // unavailable to pick here: a feature this tenant hasn't turned on.
  const availableDefs = NAV_LINK_DEFS.filter((def) => def.gate(can, hasModule));

  function toggle(key) {
    setSaved(false);
    setSelected((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));
  }

  function handleSave() {
    updateDashboardApps.mutate(selected, {
      onSuccess: () => {
        reloadConfig();
        setSaved(true);
      }
    });
  }

  return (
    <div className="max-w-[640px]">
      <div className="mb-6">
        <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">Settings / Manage Dashboard Apps</div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">Manage Dashboard Apps</h1>
        <p className="mt-1 text-[13px] text-ink-500">
          Choose which modules appear on the Home dashboard for everyone in your organisation. Everything is always
          reachable from More, whether or not it's pinned here.
        </p>
      </div>

      <div className="rounded border border-border bg-surface p-5">
        {availableDefs.length === 0 && (
          <div className="text-sm text-ink-500">No optional modules are available for your organisation yet.</div>
        )}
        {availableDefs.length > 0 && (
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {availableDefs.map((def) => (
              <label
                key={def.key}
                className="flex items-center gap-2 rounded px-2 py-2 text-[13.5px] text-ink-900 hover:bg-surface-muted"
              >
                <input type="checkbox" checked={selected.includes(def.key)} onChange={() => toggle(def.key)} />
                {def.label(t)}
              </label>
            ))}
          </div>
        )}

        {updateDashboardApps.error && (
          <div className="mt-3 text-xs font-semibold text-danger">{updateDashboardApps.error.message}</div>
        )}
        {saved && <div className="mt-3 text-xs font-semibold text-success">Dashboard apps updated.</div>}

        <button
          type="button"
          onClick={handleSave}
          disabled={updateDashboardApps.isPending}
          className="mt-4 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60"
        >
          {updateDashboardApps.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>

      <Link to="/app/profile" className="mt-6 inline-block text-xs font-semibold text-ink-500 hover:text-ink-900">
        &larr; Back to Settings
      </Link>
    </div>
  );
}
