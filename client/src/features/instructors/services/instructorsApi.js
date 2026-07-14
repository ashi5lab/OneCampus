import { apiClient } from '../../../lib/apiClient';

export const instructorsApi = {
  list: () => apiClient.get('/instructors').then((res) => res.data),
  create: (payload) => apiClient.post('/instructors', payload).then((res) => res.data)
};
