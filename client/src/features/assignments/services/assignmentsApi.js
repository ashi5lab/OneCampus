import { apiClient } from '../../../lib/apiClient';

// apiClient.get only takes a path — build query strings manually.
function qs(params = {}) {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.append(k, v);
  });
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const assignmentsApi = {
  list: (params) => apiClient.get(`/assignments${qs(params)}`).then(r => r.data),
  get: (id) => apiClient.get(`/assignments/${id}`).then(r => r.data),
  create: (payload) => apiClient.post('/assignments', payload).then(r => r.data),
  update: (id, payload) => apiClient.put(`/assignments/${id}`, payload).then(r => r.data),
  remove: (id) => apiClient.delete(`/assignments/${id}`).then(r => r.data),
  duplicate: (id) => apiClient.post(`/assignments/${id}/duplicate`).then(r => r.data),
  togglePublish: (id, publish) =>
    apiClient.patch(`/assignments/${id}/publish`, { publish }).then(r => r.data),
  getValuationStudents: (id, params) =>
    apiClient.get(`/assignments/${id}/valuation${qs(params)}`).then(r => r.data),
  upsertGrade: (id, payload) =>
    apiClient.post(`/assignments/${id}/grade`, payload).then(r => r.data),
  completeValuation: (id) =>
    apiClient.patch(`/assignments/${id}/complete`).then(r => r.data),
  getActivity: (id) => apiClient.get(`/assignments/${id}/activity`).then(r => r.data),
  listSubmissions: (id) => apiClient.get(`/assignments/${id}/submissions`).then(r => r.data),
  submit: (id, payload) =>
    apiClient.post(`/assignments/${id}/submissions`, payload).then(r => r.data),
};
