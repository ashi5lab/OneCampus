import { apiClient } from '../../../lib/apiClient';

function withQuery(path, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')).toString();
  return query ? `${path}?${query}` : path;
}

export const instructorsApi = {
  list: (filters) => apiClient.get(withQuery('/instructors', filters)).then((res) => res.data),
  create: (payload) => apiClient.post('/instructors', payload).then((res) => res.data),
  update: (id, payload) => apiClient.put(`/instructors/${id}`, payload).then((res) => res.data),
  remove: (id) => apiClient.delete(`/instructors/${id}`).then((res) => res.data),
  getProfile: (id) => apiClient.get(`/instructors/${id}/profile`).then((res) => res.data)
};
