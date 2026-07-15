import { apiClient } from '../../../lib/apiClient';

export const cohortsApi = {
  list: () => apiClient.get('/cohorts').then((res) => res.data),
  create: (payload) => apiClient.post('/cohorts', payload).then((res) => res.data),
  update: (id, payload) => apiClient.put(`/cohorts/${id}`, payload).then((res) => res.data),
  remove: (id) => apiClient.delete(`/cohorts/${id}`).then((res) => res.data)
};
