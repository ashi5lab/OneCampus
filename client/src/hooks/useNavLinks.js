import { useConfig } from '../contexts/ConfigContext';
import { useAuth } from '../contexts/AuthContext';
import { NAV_LINK_DEFS, DEFAULT_SIDEBAR_LINKS } from '../lib/sidebarLinks';

// Shared by Sidebar.jsx and the Dashboard's "V2" card view — a nav item
// shows only if the current user is actually allowed to see it (def.gate)
// AND the tenant has opted it into the sidebar (config.sidebar_links, set
// via the Manage Sidebar settings page — see ManageSidebarPage.jsx). The
// tenant-level list defaults to just Students/Teachers/Classes until an
// admin adds more; Dashboard isn't part of this list at all, it's
// hardcoded in Sidebar.jsx and always shown.
export function useNavLinks() {
  const { t, hasModule, config } = useConfig();
  const { can } = useAuth();
  const enabledKeys = config?.sidebar_links || DEFAULT_SIDEBAR_LINKS;

  return NAV_LINK_DEFS.filter((def) => enabledKeys.includes(def.key) && def.gate(can, hasModule)).map((def) => ({
    to: def.to,
    label: def.label(t)
  }));
}
