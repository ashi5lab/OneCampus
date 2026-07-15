import { apiClient, downloadFile } from '../../../lib/apiClient';

export const certificatesApi = {
  list: () => apiClient.get('/certificates').then((res) => res.data),
  issue: (payload) => apiClient.post('/certificates', payload).then((res) => res.data),
  downloadPdf: (id, certificateNo) => downloadFile(`/certificates/${id}/pdf`, `certificate-${certificateNo}.pdf`)
};
