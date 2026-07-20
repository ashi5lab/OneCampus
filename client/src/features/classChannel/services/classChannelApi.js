import { apiClient } from '../../../lib/apiClient';

export const classChannelApi = {
  myCohorts: () => apiClient.get('/class-channel/my-cohorts').then((res) => res.data),
  posts: (cohortId) => apiClient.get(`/class-channel/cohorts/${cohortId}/posts`).then((res) => res.data),
  createPost: (cohortId, body) =>
    apiClient.post(`/class-channel/cohorts/${cohortId}/posts`, { body }).then((res) => res.data),
  createReply: (postId, body) =>
    apiClient.post(`/class-channel/posts/${postId}/replies`, { body }).then((res) => res.data)
};
