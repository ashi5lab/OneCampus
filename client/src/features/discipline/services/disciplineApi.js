import { apiClient } from '../../../lib/apiClient';

function withQuery(path, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')).toString();
  return query ? `${path}?${query}` : path;
}

export const disciplineApi = {
  list: (filters = {}) => apiClient.get(withQuery('/discipline', filters)).then((res) => Array.isArray(res) ? res : res.data),
  listPage: (filters = {}) => apiClient.get(withQuery('/discipline', filters)),
  create: (payload) => apiClient.post('/discipline', payload).then((res) => Array.isArray(res) ? res[0] || res : res.data),
  update: (id, payload) => apiClient.put(`/discipline/${id}`, payload).then((res) => Array.isArray(res) ? res[0] || res : res.data),
  remove: (id) => apiClient.delete(`/discipline/${id}`).then((res) => Array.isArray(res) ? res[0] || res : res.data)
};
