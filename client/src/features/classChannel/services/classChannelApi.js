import { apiClient, uploadFile } from '../../../lib/apiClient';

// createPost/createReply always go through uploadFile (multipart), even
// when there's no attachment — the body text rides along as a form field
// either way, so there's one code path instead of a JSON path and a
// multipart path that could drift apart.
function toFormData({ body, file }) {
  const formData = new FormData();
  formData.append('body', body || '');
  if (file) formData.append('attachment', file);
  return formData;
}

export const classChannelApi = {
  myCohorts: () => apiClient.get('/class-channel/my-cohorts').then((res) => res.data),
  members: (cohortId) => apiClient.get(`/class-channel/cohorts/${cohortId}/members`).then((res) => res.data),
  posts: (cohortId) => apiClient.get(`/class-channel/cohorts/${cohortId}/posts`).then((res) => res),

  createPost: (cohortId, { body, file }) =>
    uploadFile(`/class-channel/cohorts/${cohortId}/posts`, toFormData({ body, file })).then((res) => res.data),
  createReply: (postId, { body, file }) =>
    uploadFile(`/class-channel/posts/${postId}/replies`, toFormData({ body, file })).then((res) => res.data),

  editPost: (id, body) => apiClient.patch(`/class-channel/posts/${id}`, { body }).then((res) => res.data),
  editReply: (id, body) => apiClient.patch(`/class-channel/replies/${id}`, { body }).then((res) => res.data),

  getPostEditHistory: (id) => apiClient.get(`/class-channel/posts/${id}/edits`).then((res) => res.data),
  getReplyEditHistory: (id) => apiClient.get(`/class-channel/replies/${id}/edits`).then((res) => res.data),

  deletePost: (id) => apiClient.delete(`/class-channel/posts/${id}`).then((res) => res.data),
  deleteReply: (id) => apiClient.delete(`/class-channel/replies/${id}`).then((res) => res.data),

  setReaction: (postId, emoji) => apiClient.put(`/class-channel/posts/${postId}/reaction`, { emoji }).then((res) => res.data),

  pinPost: (cohortId, postId) => apiClient.put(`/class-channel/cohorts/${cohortId}/pin`, { postId }).then((res) => res.data),
  unpinPost: (cohortId) => apiClient.delete(`/class-channel/cohorts/${cohortId}/pin`).then((res) => res.data),

  // Documents tab (standalone per-cohort file library, separate from chat
  // attachments). Upload is multipart with a single 'file' field.
  documents: (cohortId) => apiClient.get(`/class-channel/cohorts/${cohortId}/documents`).then((res) => res.data),
  uploadDocument: (cohortId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return uploadFile(`/class-channel/cohorts/${cohortId}/documents`, formData).then((res) => res.data);
  },
  deleteDocument: (id) => apiClient.delete(`/class-channel/documents/${id}`).then((res) => res.data)
};
