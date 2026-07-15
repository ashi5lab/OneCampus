import { apiClient } from '../../../lib/apiClient';

export const learnersApi = {
  list: () => apiClient.get('/learners').then((res) => res.data),
  create: (payload) => apiClient.post('/learners', payload).then((res) => res.data),
  update: (id, payload) => apiClient.put(`/learners/${id}`, payload).then((res) => res.data),
  remove: (id) => apiClient.delete(`/learners/${id}`).then((res) => res.data)
};
