import { apiClient } from '../../../lib/apiClient';

export const instructorsApi = {
  list: () => apiClient.get('/instructors').then((res) => res.data),
  create: (payload) => apiClient.post('/instructors', payload).then((res) => res.data),
  update: (id, payload) => apiClient.put(`/instructors/${id}`, payload).then((res) => res.data),
  remove: (id) => apiClient.delete(`/instructors/${id}`).then((res) => res.data)
};
