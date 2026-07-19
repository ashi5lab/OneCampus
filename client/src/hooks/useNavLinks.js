import { useConfig } from '../contexts/ConfigContext';
import { useAuth } from '../contexts/AuthContext';
import { NAV_LINK_DEFS, DEFAULT_DASHBOARD_APPS } from '../lib/sidebarLinks';

function toLink(def, t) {
  return { key: def.key, to: def.to, label: def.label(t), description: def.description(t) };
}

// The Dashboard's "Your Modules" grid — every feature the tenant has pinned
// as a dashboard app (config.dashboard_apps, set via Settings > Manage
// Dashboard Apps) that this user can also actually access (def.gate). See
// useAllFeatureLinks below for the unfiltered version used by the More
// directory. The sidebar/bottom-tab nav (Dashboard/Students/Classes/More/
// Settings) is fixed and isn't part of this list at all.
export function useNavLinks() {
  const { t, hasModule, config } = useConfig();
  const { can } = useAuth();
  const enabledKeys = config?.dashboard_apps || DEFAULT_DASHBOARD_APPS;
  return NAV_LINK_DEFS.filter((def) => enabledKeys.includes(def.key) && def.gate(can, hasModule)).map((def) => toLink(def, t));
}

// The More directory — every feature this user can access, regardless of
// whether the tenant has pinned it to the Dashboard.
export function useAllFeatureLinks() {
  const { t, hasModule } = useConfig();
  const { can } = useAuth();
  return NAV_LINK_DEFS.filter((def) => def.gate(can, hasModule)).map((def) => toLink(def, t));
}
