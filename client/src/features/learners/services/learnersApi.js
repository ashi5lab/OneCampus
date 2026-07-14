import { apiClient } from '../../../lib/apiClient';

export const learnersApi = {
  list: () => apiClient.get('/learners').then((res) => res.data),
  create: (payload) => apiClient.post('/learners', payload).then((res) => res.data)
};
