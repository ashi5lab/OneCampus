import { apiClient } from '../../../lib/apiClient';

export const messagesApi = {
  inbox: () => apiClient.get('/messages/inbox').then((res) => res.data),
  sent: () => apiClient.get('/messages/sent').then((res) => res.data),
  unreadCount: () => apiClient.get('/messages/unread-count').then((res) => res.data.count),
  recipients: () => apiClient.get('/messages/recipients').then((res) => res.data),
  send: (payload) => apiClient.post('/messages', payload).then((res) => res.data),
  markRead: (id) => apiClient.patch(`/messages/${id}/read`).then((res) => res.data)
};
