import { apiClient, downloadFile } from '../../../lib/apiClient';

export const evaluationsApi = {
  list: () => apiClient.get('/evaluations').then((res) => res.data),
  get: (id) => apiClient.get(`/evaluations/${id}`).then((res) => res.data),
  create: (payload) => apiClient.post('/evaluations', payload).then((res) => res.data),
  listSchedules: (evaluationId) =>
    apiClient.get(`/evaluations/${evaluationId}/schedules`).then((res) => res.data),
  createSchedule: (evaluationId, payload) =>
    apiClient.post(`/evaluations/${evaluationId}/schedules`, payload).then((res) => res.data),
  listScores: (scheduleId) =>
    apiClient.get(`/evaluations/schedules/${scheduleId}/scores`).then((res) => res.data),
  recordScore: (scheduleId, payload) =>
    apiClient.post(`/evaluations/schedules/${scheduleId}/scores`, payload).then((res) => res.data),

  getReportCard: (evaluationId, learnerId) =>
    apiClient.get(`/evaluations/${evaluationId}/report-card/${learnerId}`).then((res) => res.data),
  downloadReportCardPdf: (evaluationId, learnerId, filename) =>
    downloadFile(`/evaluations/${evaluationId}/report-card/${learnerId}/pdf`, filename)
};
