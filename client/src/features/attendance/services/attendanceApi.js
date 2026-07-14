import { apiClient } from '../../../lib/apiClient';

export const attendanceApi = {
  list: () => apiClient.get('/attendance').then((res) => res.data)
};
