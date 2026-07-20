import { apiClient } from '../../../lib/apiClient';

// Not unwrapped to `.data` like most services — the response carries both
// `data` (the feed items) and `recentCount` (for the Activities tab badge),
// so the caller needs the whole payload.
export const activitiesApi = {
  list: () => apiClient.get('/activities')
};
