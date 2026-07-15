import { apiClient } from '../../../lib/apiClient';

export const attendanceApi = {
  list: () => apiClient.get('/attendance').then((res) => res.data),
  listByCohortDate: (cohortId, date) =>
    apiClient.get(`/attendance?cohort_id=${cohortId}&date=${date}`).then((res) => res.data),
  mark: (payload) => apiClient.post('/attendance', payload).then((res) => res.data)
};
