import { apiClient } from '../../../lib/apiClient';

export const staffAttendanceApi = {
  mine: () => apiClient.get('/staff-attendance/mine').then((res) => res.data),
  listByDate: (date) => apiClient.get(`/staff-attendance?date=${date}`).then((res) => res.data),
  mark: (payload) => apiClient.post('/staff-attendance', payload).then((res) => res.data)
};
