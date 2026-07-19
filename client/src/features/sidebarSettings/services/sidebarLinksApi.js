import { apiClient } from '../../../lib/apiClient';

export const dashboardAppsApi = {
  update: (dashboardApps) =>
    apiClient.patch('/tenant/config/dashboard-apps', { dashboard_apps: dashboardApps }).then((res) => res.data)
};
