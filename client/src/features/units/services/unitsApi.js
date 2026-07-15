import { apiClient } from '../../../lib/apiClient';

export const unitsApi = {
  list: () => apiClient.get('/units').then((res) => res.data),
  create: (payload) => apiClient.post('/units', payload).then((res) => res.data),
  update: (id, payload) => apiClient.put(`/units/${id}`, payload).then((res) => res.data),
  remove: (id) => apiClient.delete(`/units/${id}`).then((res) => res.data)
};
