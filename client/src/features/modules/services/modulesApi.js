import { apiClient } from '../../../lib/apiClient';

export const modulesApi = {
  list: () => apiClient.get('/modules').then((res) => res.data)
};
