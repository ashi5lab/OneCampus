import { apiClient } from '../../../lib/apiClient';

export const kindergartenActivityApi = {
  list: () => apiClient.get('/kindergarten-activity').then((res) => res.data),
  log: (payload) => apiClient.post('/kindergarten-activity', payload).then((res) => res.data)
};
