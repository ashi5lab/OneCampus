import { useMutation } from '@tanstack/react-query';
import { dashboardAppsApi } from '../services/sidebarLinksApi';

// No query invalidation here — ConfigContext's `config` (which carries
// dashboard_apps) isn't a react-query cache, it's plain component state
// refetched via reloadConfig(); the caller is expected to call that after
// a successful save (see ManageDashboardAppsPage.jsx).
export function useUpdateDashboardApps() {
  return useMutation({ mutationFn: dashboardAppsApi.update });
}
