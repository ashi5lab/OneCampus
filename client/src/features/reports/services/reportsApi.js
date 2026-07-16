import { apiClient } from '../../../lib/apiClient';

function withQuery(path, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')).toString();
  return query ? `${path}?${query}` : path;
}

export const reportsApi = {
  dashboard: () => apiClient.get('/reports/dashboard').then((res) => res.data),
  analytics: () => apiClient.get('/reports/analytics').then((res) => res.data),
  overview: () => apiClient.get('/reports/overview').then((res) => res.data),
  attendance: (params) => apiClient.get(withQuery('/reports/attendance', params)),
  academicPerformance: (params) => apiClient.get(withQuery('/reports/academic-performance', params)).then((res) => res.data),
  assignments: () => apiClient.get('/reports/assignments').then((res) => res.data),
  onlineExams: () => apiClient.get('/reports/online-exams').then((res) => res.data),
  library: () => apiClient.get('/reports/library').then((res) => res.data),
  certificates: () => apiClient.get('/reports/certificates').then((res) => res.data)
};
