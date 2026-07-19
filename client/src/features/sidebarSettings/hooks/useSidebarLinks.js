import { useMutation } from '@tanstack/react-query';
import { sidebarLinksApi } from '../services/sidebarLinksApi';

// No query invalidation here — ConfigContext's `config` (which carries
// sidebar_links) isn't a react-query cache, it's plain component state
// refetched via reloadConfig(); the caller is expected to call that after
// a successful save (see ManageSidebarPage.jsx).
export function useUpdateSidebarLinks() {
  return useMutation({ mutationFn: sidebarLinksApi.update });
}
