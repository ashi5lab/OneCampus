import { apiClient } from '../../../lib/apiClient';

export const accessControlApi = {
  listGroups: () => apiClient.get('/access-control/groups').then((res) => res.data),
  createGroup: (payload) => apiClient.post('/access-control/groups', payload).then((res) => res.data),
  updateGroup: (id, payload) => apiClient.put(`/access-control/groups/${id}`, payload).then((res) => res.data),
  removeGroup: (id) => apiClient.delete(`/access-control/groups/${id}`).then((res) => res.data),
  listUsers: () => apiClient.get('/access-control/users').then((res) => res.data),
  listPermissions: () => apiClient.get('/access-control/permissions').then((res) => res.data)
};
