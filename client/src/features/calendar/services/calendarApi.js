import { apiClient } from '../../../lib/apiClient';

export const calendarApi = {
  agenda: (from, to) => apiClient.get(`/calendar/agenda?from=${from}&to=${to}`).then((res) => res.data),
  listEvents: () => apiClient.get('/calendar/events').then((res) => res.data),
  create: (payload) => apiClient.post('/calendar/events', payload).then((res) => res.data),
  update: (id, payload) => apiClient.put(`/calendar/events/${id}`, payload).then((res) => res.data),
  remove: (id) => apiClient.delete(`/calendar/events/${id}`).then((res) => res.data)
};
