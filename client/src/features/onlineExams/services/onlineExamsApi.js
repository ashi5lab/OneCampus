import { apiClient } from '../../../lib/apiClient';

export const onlineExamsApi = {
  list: () => apiClient.get('/online-exams').then((res) => res.data),
  get: (id) => apiClient.get(`/online-exams/${id}`).then((res) => res.data),
  create: (payload) => apiClient.post('/online-exams', payload).then((res) => res.data),
  update: (id, payload) => apiClient.put(`/online-exams/${id}`, payload).then((res) => res.data),
  remove: (id) => apiClient.delete(`/online-exams/${id}`).then((res) => res.data),
  publish: (id, published) => apiClient.put(`/online-exams/${id}/publish`, { published }).then((res) => res.data),

  start: (id) => apiClient.post(`/online-exams/${id}/start`).then((res) => res.data),
  mySubmission: (id) => apiClient.get(`/online-exams/${id}/my-submission`).then((res) => res.data),
  submit: (id, payload) => apiClient.post(`/online-exams/${id}/submit`, payload).then((res) => res.data),

  listSubmissions: (id) => apiClient.get(`/online-exams/${id}/submissions`).then((res) => res.data),
  getSubmission: (submissionId) => apiClient.get(`/online-exams/submissions/${submissionId}`).then((res) => res.data),
  grade: (submissionId, payload) =>
    apiClient.put(`/online-exams/submissions/${submissionId}/grade`, payload).then((res) => res.data)
};
