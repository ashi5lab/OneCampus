import { apiClient, uploadFile } from '../../../lib/apiClient';

export const profileApi = {
  uploadPicture: (file) => {
    const formData = new FormData();
    formData.append('picture', file);
    return uploadFile('/profile/picture', formData).then((res) => res.data);
  },
  removePicture: () => apiClient.delete('/profile/picture').then((res) => res.data)
};
