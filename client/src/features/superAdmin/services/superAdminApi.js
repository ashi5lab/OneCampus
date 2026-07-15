import { superAdminApiClient } from '../../../lib/superAdminApiClient';

export const superAdminApi = {
  login: (payload) => superAdminApiClient.post('/super-admin/login', payload).then((res) => res.data),
  me: () => superAdminApiClient.get('/super-admin/me').then((res) => res.data),
  listTenants: (status) =>
    superAdminApiClient.get(`/tenants${status ? `?status=${status}` : ''}`).then((res) => res.data),
  approveTenant: (id) => superAdminApiClient.patch(`/tenants/${id}/approve`).then((res) => res.data),
  declineTenant: (id, reason) =>
    superAdminApiClient.patch(`/tenants/${id}/decline`, { reason }).then((res) => res.data),
  updateTenant: (id, payload) => superAdminApiClient.patch(`/tenants/${id}`, payload).then((res) => res.data),
  deleteTenant: (id) => superAdminApiClient.delete(`/tenants/${id}`).then((res) => res.data)
};
