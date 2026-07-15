import { apiClient } from '../../../lib/apiClient';

export const guardiansApi = {
  list: () => apiClient.get('/guardians').then((res) => res.data),
  create: (payload) => apiClient.post('/guardians', payload).then((res) => res.data),
  update: (id, payload) => apiClient.put(`/guardians/${id}`, payload).then((res) => res.data),
  remove: (id) => apiClient.delete(`/guardians/${id}`).then((res) => res.data)
};
