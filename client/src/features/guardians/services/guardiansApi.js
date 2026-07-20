import { apiClient } from '../../../lib/apiClient';

function withQuery(path, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')).toString();
  return query ? `${path}?${query}` : path;
}

export const guardiansApi = {
  list: () => apiClient.get('/guardians').then((res) => res.data),
  // See learnersApi.listPage's comment — keeps `meta` for the roster
  // page's server-side pagination.
  listPage: (params) => apiClient.get(withQuery('/guardians', params)),
  create: (payload) => apiClient.post('/guardians', payload).then((res) => res.data),
  update: (id, payload) => apiClient.put(`/guardians/${id}`, payload).then((res) => res.data),
  remove: (id) => apiClient.delete(`/guardians/${id}`).then((res) => res.data),
  getProfile: (id) => apiClient.get(`/guardians/${id}/profile`).then((res) => res.data)
};
