import { apiClient } from '../../../lib/apiClient';

function qs(params = {}) {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.append(k, v);
  });
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const examsApi = {
  list: (params) => apiClient.get(`/exams${qs(params)}`).then(r => ({
    exams: r.data,
    total: r.meta?.total ?? 0,
    meta: r.meta
  })),
  get: (id) => apiClient.get(`/exams/${id}`).then(r => r.data),
  create: (payload) => apiClient.post('/exams', payload).then(r => r.data),
  update: (id, payload) => apiClient.put(`/exams/${id}`, payload).then(r => r.data),
  remove: (id) => apiClient.delete(`/exams/${id}`).then(r => r.data),
  duplicate: (id) => apiClient.post(`/exams/${id}/duplicate`).then(r => r.data),
  togglePublish: (id, published) =>
    apiClient.patch(`/exams/${id}/publish`, { published }).then(r => r.data),
  getValuationStudents: (id, params) =>
    apiClient.get(`/exams/${id}/valuation${qs(params)}`).then(r => ({
      students: r.data,
      total: r.meta?.total ?? 0,
      meta: r.meta
    })),
  upsertGrade: (id, payload) =>
    apiClient.post(`/exams/${id}/grade`, payload).then(r => r.data),
  completeValuation: (id) =>
    apiClient.patch(`/exams/${id}/complete`).then(r => r.data),
  getActivity: (id) => apiClient.get(`/exams/${id}/activity`).then(r => r.data),
  listSubmissions: (id) => apiClient.get(`/exams/${id}/submissions`).then(r => r.data),
};
