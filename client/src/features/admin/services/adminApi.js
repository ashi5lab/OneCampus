import { apiClient } from '../../../lib/apiClient';

export const adminApi = {
  getUsersReport: ({ search = '', filter = 'all' } = {}) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filter && filter !== 'all') params.set('filter', filter);
    return apiClient.get(`/profile/users/report?${params.toString()}`).then((r) => r.data);
  },

  changeUserRole: (userId, role) =>
    apiClient.patch(`/profile/users/${userId}/role`, { role }).then((r) => r.data),

  assignLearnerCohort: (learnerId, cohortId) =>
    apiClient.patch(`/learners/${learnerId}/cohort`, { cohort_id: cohortId }).then((r) => r.data)
};
