import { apiClient } from '../../../lib/apiClient';

export const leaveApi = {
  listMine: () => apiClient.get('/leave/mine').then((res) => res.data),
  listQueue: () => apiClient.get('/leave').then((res) => res.data),
  apply: (payload) => apiClient.post('/leave', payload).then((res) => res.data),
  review: (id, payload) => apiClient.patch(`/leave/${id}/review`, payload).then((res) => res.data),
  cancel: (id) => apiClient.delete(`/leave/${id}`).then((res) => res.data)
};
