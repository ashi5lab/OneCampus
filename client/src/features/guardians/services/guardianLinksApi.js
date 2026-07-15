import { apiClient } from '../../../lib/apiClient';

export const guardianLinksApi = {
  list: () => apiClient.get('/guardian-links').then((res) => res.data),
  create: (payload) => apiClient.post('/guardian-links', payload).then((res) => res.data),
  remove: ({ learnerId, guardianId }) =>
    apiClient.delete(`/guardian-links/${learnerId}/${guardianId}`).then((res) => res.data)
};
