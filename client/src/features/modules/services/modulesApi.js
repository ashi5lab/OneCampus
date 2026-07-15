import { apiClient } from '../../../lib/apiClient';

export const modulesApi = {
  list: () => apiClient.get('/modules').then((res) => res.data),
  create: (payload) => apiClient.post('/modules', payload).then((res) => res.data)
};
