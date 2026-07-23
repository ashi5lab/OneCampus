import { apiClient } from '../../../lib/apiClient';

export const attendanceApi = {
  list: () => apiClient.get('/attendance').then((res) => res.data),
  listByCohortDate: (cohortId, date) =>
    apiClient.get(`/attendance?cohort_id=${cohortId}&date=${date}`).then((res) => res.data),
  absenteeReport: (date, cohortIds = []) => {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (cohortIds.length > 0) params.set('cohort_ids', cohortIds.join(','));
    return apiClient.get(`/attendance/absentee-report?${params.toString()}`).then((res) => res.data);
  },
  mark: (payload) => apiClient.post('/attendance', payload).then((res) => res.data)
};
