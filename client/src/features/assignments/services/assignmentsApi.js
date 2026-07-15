import { apiClient } from '../../../lib/apiClient';

export const assignmentsApi = {
  list: () => apiClient.get('/assignments').then((res) => res.data),
  create: (payload) => apiClient.post('/assignments', payload).then((res) => res.data),
  update: (id, payload) => apiClient.put(`/assignments/${id}`, payload).then((res) => res.data),
  remove: (id) => apiClient.delete(`/assignments/${id}`).then((res) => res.data),
  listSubmissions: (id) => apiClient.get(`/assignments/${id}/submissions`).then((res) => res.data),
  submit: (id, payload) => apiClient.post(`/assignments/${id}/submissions`, payload).then((res) => res.data),
  grade: (submissionId, payload) =>
    apiClient.put(`/assignments/submissions/${submissionId}/grade`, payload).then((res) => res.data)
};
