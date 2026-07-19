import { apiClient } from '../../../lib/apiClient';

export const instructorModulesApi = {
  list: () => apiClient.get('/instructor-modules').then((res) => res.data),
  create: (payload) => apiClient.post('/instructor-modules', payload).then((res) => res.data),
  remove: ({ instructorId, moduleId }) =>
    apiClient.delete(`/instructor-modules/${instructorId}/${moduleId}`).then((res) => res.data)
};
