import { apiClient } from '../../../lib/apiClient';

export const modulesApi = {
  list: () => apiClient.get('/modules').then((res) => res.data),
  create: (payload) => apiClient.post('/modules', payload).then((res) => res.data),
  update: (id, payload) => apiClient.put(`/modules/${id}`, payload).then((res) => res.data),
  remove: (id) => apiClient.delete(`/modules/${id}`).then((res) => res.data)
};
