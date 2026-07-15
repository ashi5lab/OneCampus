import { apiClient } from '../../../lib/apiClient';

export const guardiansApi = {
  list: () => apiClient.get('/guardians').then((res) => res.data),
  create: (payload) => apiClient.post('/guardians', payload).then((res) => res.data)
};
