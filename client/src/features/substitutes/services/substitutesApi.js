import { apiClient } from '../../../lib/apiClient';

export const substitutesApi = {
  getCoverage: (leaveRequestId) => apiClient.get(`/substitutes/coverage/${leaveRequestId}`).then((res) => res.data),
  assign: (payload) => apiClient.post('/substitutes', payload).then((res) => res.data),
  unassign: (id) => apiClient.delete(`/substitutes/${id}`).then((res) => res.data)
};
