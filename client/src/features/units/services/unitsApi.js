import { apiClient } from '../../../lib/apiClient';

export const unitsApi = {
  list: () => apiClient.get('/units').then((res) => res.data),
  create: (payload) => apiClient.post('/units', payload).then((res) => res.data)
};
