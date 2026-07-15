import { apiClient } from '../../../lib/apiClient';

export const noticesApi = {
  list: () => apiClient.get('/notices').then((res) => res.data),
  create: (payload) => apiClient.post('/notices', payload).then((res) => res.data),
  update: (id, payload) => apiClient.put(`/notices/${id}`, payload).then((res) => res.data),
  remove: (id) => apiClient.delete(`/notices/${id}`).then((res) => res.data)
};
