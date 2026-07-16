import { apiClient } from '../../../lib/apiClient';

function withQuery(path, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')).toString();
  return query ? `${path}?${query}` : path;
}

export const learnersApi = {
  list: (filters) => apiClient.get(withQuery('/learners', filters)).then((res) => res.data),
  create: (payload) => apiClient.post('/learners', payload).then((res) => res.data),
  update: (id, payload) => apiClient.put(`/learners/${id}`, payload).then((res) => res.data),
  remove: (id) => apiClient.delete(`/learners/${id}`).then((res) => res.data),
  getProfile: (id) => apiClient.get(`/learners/${id}/profile`).then((res) => res.data)
};
