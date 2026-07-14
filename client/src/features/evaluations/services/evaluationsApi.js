import { apiClient } from '../../../lib/apiClient';

export const evaluationsApi = {
  list: () => apiClient.get('/evaluations').then((res) => res.data)
};
