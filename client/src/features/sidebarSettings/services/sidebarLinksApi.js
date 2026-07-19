import { apiClient } from '../../../lib/apiClient';

export const sidebarLinksApi = {
  update: (sidebarLinks) =>
    apiClient.patch('/tenant/config/sidebar-links', { sidebar_links: sidebarLinks }).then((res) => res.data)
};
