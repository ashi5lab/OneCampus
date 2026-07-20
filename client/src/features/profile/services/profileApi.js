import { apiClient, uploadFile } from '../../../lib/apiClient';

export const profileApi = {
  uploadPicture: (file) => {
    const formData = new FormData();
    formData.append('picture', file);
    return uploadFile('/profile/picture', formData).then((res) => res.data);
  },
  removePicture: () => apiClient.delete('/profile/picture').then((res) => res.data),
  me: () => apiClient.get('/profile/me').then((res) => res.data),
  changePassword: (payload) => apiClient.put('/profile/password', payload).then((res) => res.data),
  getNotificationPreferences: () => apiClient.get('/profile/notification-preferences').then((res) => res.data),
  updateNotificationPreferences: (payload) => apiClient.put('/profile/notification-preferences', payload).then((res) => res.data),
  getHomeCardPrefs: () => apiClient.get('/profile/home-card-prefs').then((res) => res.data),
  updateHomeCardPrefs: (payload) => apiClient.put('/profile/home-card-prefs', payload).then((res) => res.data),
  listUsers: () => apiClient.get('/profile/users').then((res) => res.data),
  adminChangePassword: (userId, payload) =>
    apiClient.put(`/profile/users/${userId}/password`, payload).then((res) => res.data),
  forceLogoutUser: (userId) => apiClient.post(`/profile/users/${userId}/force-logout`).then((res) => res.data)
};
