import { apiClient, uploadFile, downloadFile } from '../../../lib/apiClient';

export const bulkUploadApi = {
  listJobs: (entityType) =>
    apiClient.get(`/bulk-upload/jobs${entityType ? `?entity_type=${entityType}` : ''}`).then((res) => res.data),
  getJob: (id) => apiClient.get(`/bulk-upload/jobs/${id}`).then((res) => res.data),

  upload: (entityType, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return uploadFile(`/bulk-upload/${entityType}/upload`, formData).then((res) => res.data);
  },

  downloadTemplate: (entityType, format, fileLabel) =>
    downloadFile(`/bulk-upload/template/${entityType}?format=${format}`, `${fileLabel}_template.${format}`),
  downloadFailures: (jobId) => downloadFile(`/bulk-upload/jobs/${jobId}/failures.xlsx`, `bulk_upload_${jobId}_failures.xlsx`)
};
