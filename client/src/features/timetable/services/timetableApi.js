import { apiClient } from '../../../lib/apiClient';

export const timetableApi = {
  listForCohort: (cohortId) => apiClient.get(`/timetable?cohort_id=${cohortId}`).then((res) => res.data),
  myCohorts: () => apiClient.get('/timetable/my-cohorts').then((res) => res.data),
  mine: () => apiClient.get('/timetable/mine').then((res) => res.data),
  create: (payload) => apiClient.post('/timetable', payload).then((res) => res.data),
  update: (id, payload) => apiClient.put(`/timetable/${id}`, payload).then((res) => res.data),
  remove: (id) => apiClient.delete(`/timetable/${id}`).then((res) => res.data)
};
