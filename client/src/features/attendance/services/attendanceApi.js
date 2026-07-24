import { apiClient } from '../../../lib/apiClient';

export const attendanceApi = {
  list: (page, pageSize) => {
    const params = new URLSearchParams();
    if (page) params.set('page', page);
    if (pageSize) params.set('pageSize', pageSize);
    return apiClient.get(`/attendance?${params.toString()}`).then((res) => res.data);
  },
  listByCohortDate: (cohortId, date, page, pageSize) => {
    const params = new URLSearchParams();
    params.set('cohort_id', cohortId);
    params.set('date', date);
    if (page) params.set('page', page);
    if (pageSize) params.set('pageSize', pageSize);
    return apiClient.get(`/attendance?${params.toString()}`).then((res) => res.data);
  },
  absenteeReport: (date, cohortIds = []) => {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (cohortIds.length > 0) params.set('cohort_ids', cohortIds.join(','));
    return apiClient.get(`/attendance/absentee-report?${params.toString()}`).then((res) => res.data);
  },
  mark: (payload) => apiClient.post('/attendance', payload).then((res) => res.data)
};
