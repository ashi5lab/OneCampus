import { apiClient } from '../../../lib/apiClient';

export const cohortsApi = {
  list: () => apiClient.get('/cohorts').then((res) => res.data),
  create: (payload) => apiClient.post('/cohorts', payload).then((res) => res.data)
};
