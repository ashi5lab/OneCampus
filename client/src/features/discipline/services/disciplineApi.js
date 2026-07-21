import { apiClient } from '../../../lib/apiClient';

export const disciplineApi = {
  list: (learnerId) => apiClient.get(`/discipline${learnerId ? `?learner_id=${learnerId}` : ''}`).then((res) => res.data),
  create: (payload) => apiClient.post('/discipline', payload).then((res) => res.data),
  update: (id, payload) => apiClient.put(`/discipline/${id}`, payload).then((res) => res.data),
  remove: (id) => apiClient.delete(`/discipline/${id}`).then((res) => res.data)
};
