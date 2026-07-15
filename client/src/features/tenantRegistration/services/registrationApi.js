import { apiClient } from '../../../lib/apiClient';

export const registrationApi = {
  register: (payload) => apiClient.post('/platform/tenants/register', payload).then((res) => res.data),
  getStatus: (domain) =>
    apiClient.get(`/platform/tenants/status?domain=${encodeURIComponent(domain)}`).then((res) => res.data)
};
