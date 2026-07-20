import { apiClient } from '../../../lib/apiClient';

function withQuery(path, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')).toString();
  return query ? `${path}?${query}` : path;
}

export const staffApi = {
  list: (filters) => apiClient.get(withQuery('/staff', filters)).then((res) => res.data),
  // See learnersApi.listPage's comment — keeps `meta` for the roster
  // page's server-side pagination.
  listPage: (filters) => apiClient.get(withQuery('/staff', filters)),
  create: (payload) => apiClient.post('/staff', payload).then((res) => res.data),
  update: (id, payload) => apiClient.put(`/staff/${id}`, payload).then((res) => res.data),
  remove: (id) => apiClient.delete(`/staff/${id}`).then((res) => res.data),
  setDesignation: (id, designation) => apiClient.patch(`/staff/${id}/designation`, { designation }).then((res) => res.data)
};
