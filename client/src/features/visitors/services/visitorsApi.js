import { apiClient } from '../../../lib/apiClient';

function withQuery(path, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')).toString();
  return query ? `${path}?${query}` : path;
}

export const visitorsApi = {
  list: (filters) => apiClient.get(withQuery('/visitors', filters)).then((res) => res.data),
  checkIn: (payload) => apiClient.post('/visitors', payload).then((res) => res.data),
  checkOut: (id) => apiClient.put(`/visitors/${id}/checkout`).then((res) => res.data)
};
