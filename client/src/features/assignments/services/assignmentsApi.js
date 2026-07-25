import { apiClient } from '../../../lib/apiClient';

export const assignmentsApi = {
  list: (params) => apiClient.get('/assignments', { params }).then(r => r.data),
  get: (id) => apiClient.get(`/assignments/${id}`).then(r => r.data),
  create: (payload) => apiClient.post('/assignments', payload).then(r => r.data),
  update: (id, payload) => apiClient.put(`/assignments/${id}`, payload).then(r => r.data),
  remove: (id) => apiClient.delete(`/assignments/${id}`).then(r => r.data),
  duplicate: (id) => apiClient.post(`/assignments/${id}/duplicate`).then(r => r.data),
  togglePublish: (id, publish) =>
    apiClient.patch(`/assignments/${id}/publish`, { publish }).then(r => r.data),
  getValuationStudents: (id, params) =>
    apiClient.get(`/assignments/${id}/valuation`, { params }).then(r => r.data),
  upsertGrade: (id, payload) =>
    apiClient.post(`/assignments/${id}/grade`, payload).then(r => r.data),
  completeValuation: (id) =>
    apiClient.patch(`/assignments/${id}/complete`).then(r => r.data),
  listSubmissions: (id) => apiClient.get(`/assignments/${id}/submissions`).then(r => r.data),
  submit: (id, payload) =>
    apiClient.post(`/assignments/${id}/submissions`, payload).then(r => r.data),
};
