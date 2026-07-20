import { apiClient } from '../../../lib/apiClient';

function withQuery(path, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')).toString();
  return query ? `${path}?${query}` : path;
}

export const learnersApi = {
  list: (filters) => apiClient.get(withQuery('/learners', filters)).then((res) => res.data),
  // Unlike list() above, doesn't unwrap to just the rows array — keeps
  // `meta` ({total, page, pageSize}) too, since the roster page's
  // server-side pagination needs the total count to render page controls.
  // Only meaningful when `filters` includes page/pageSize (see
  // server/lib/pagination.js) — otherwise the server omits `meta` entirely.
  listPage: (filters) => apiClient.get(withQuery('/learners', filters)),
  create: (payload) => apiClient.post('/learners', payload).then((res) => res.data),
  update: (id, payload) => apiClient.put(`/learners/${id}`, payload).then((res) => res.data),
  remove: (id) => apiClient.delete(`/learners/${id}`).then((res) => res.data),
  getProfile: (id) => apiClient.get(`/learners/${id}/profile`).then((res) => res.data),
  setClassHead: (id, is_class_head) => apiClient.patch(`/learners/${id}/class-head`, { is_class_head }).then((res) => res.data),
  setSchoolHead: (id, is_school_head) => apiClient.patch(`/learners/${id}/school-head`, { is_school_head }).then((res) => res.data)
};
