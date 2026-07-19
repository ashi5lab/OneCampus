import { apiClient } from '../../../lib/apiClient';

export const instructorCohortsApi = {
  list: () => apiClient.get('/instructor-cohorts').then((res) => res.data),
  create: (payload) => apiClient.post('/instructor-cohorts', payload).then((res) => res.data),
  remove: ({ instructorId, cohortId }) =>
    apiClient.delete(`/instructor-cohorts/${instructorId}/${cohortId}`).then((res) => res.data)
};
