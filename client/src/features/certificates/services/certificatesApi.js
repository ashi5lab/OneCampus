import { apiClient } from '../../../lib/apiClient';

export const certificatesApi = {
  list: () => apiClient.get('/certificates').then((res) => res.data),
  issue: (payload) => apiClient.post('/certificates', payload).then((res) => res.data)
};
