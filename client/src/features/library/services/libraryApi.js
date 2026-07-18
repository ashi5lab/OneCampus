import { apiClient } from '../../../lib/apiClient';

export const libraryApi = {
  listBooks: () => apiClient.get('/library/books').then((res) => res.data),
  createBook: (payload) => apiClient.post('/library/books', payload).then((res) => res.data),
  updateBook: (id, payload) => apiClient.put(`/library/books/${id}`, payload).then((res) => res.data),
  removeBook: (id) => apiClient.delete(`/library/books/${id}`).then((res) => res.data),
  listBorrowers: () => apiClient.get('/library/borrowers').then((res) => res.data),
  listLoans: () => apiClient.get('/library/loans').then((res) => res.data),
  issueLoan: (payload) => apiClient.post('/library/loans', payload).then((res) => res.data),
  returnLoan: (id) => apiClient.patch(`/library/loans/${id}/return`).then((res) => res.data),
  waiveFine: (id, payload) => apiClient.patch(`/library/loans/${id}/waive-fine`, payload).then((res) => res.data)
};
