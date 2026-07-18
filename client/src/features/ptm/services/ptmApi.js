import { apiClient } from '../../../lib/apiClient';

export const ptmApi = {
  listSlots: () => apiClient.get('/ptm/slots').then((res) => res.data),
  createSlot: (payload) => apiClient.post('/ptm/slots', payload).then((res) => res.data),
  removeSlot: (id) => apiClient.delete(`/ptm/slots/${id}`).then((res) => res.data),
  bookSlot: (id, payload) => apiClient.post(`/ptm/slots/${id}/book`, payload).then((res) => res.data),
  cancelBooking: (id) => apiClient.delete(`/ptm/bookings/${id}`).then((res) => res.data),
  myLearners: () => apiClient.get('/ptm/my-learners').then((res) => res.data)
};
