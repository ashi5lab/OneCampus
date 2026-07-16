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
  listUsers: () => apiClient.get('/profile/users').then((res) => res.data),
  adminChangePassword: (userId, payload) =>
    apiClient.put(`/profile/users/${userId}/password`, payload).then((res) => res.data)
};
