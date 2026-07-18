import { apiClient, uploadFile } from '../../../lib/apiClient';

export const broadcastApi = {
  listConfigs: () => apiClient.get('/broadcast/config').then((res) => res.data),
  saveConfig: (channel, payload) => apiClient.put(`/broadcast/config/${channel}`, payload).then((res) => res.data),

  list: (channel) => apiClient.get(`/broadcast?channel=${channel}`).then((res) => res.data),
  listUsers: () => apiClient.get('/broadcast/users').then((res) => res.data),

  sendSms: (payload) => apiClient.post('/broadcast/sms', payload).then((res) => res.data),
  sendWhatsapp: (payload) => apiClient.post('/broadcast/whatsapp', payload).then((res) => res.data),

  submitVoicemail: (blob, durationSeconds) => {
    const formData = new FormData();
    formData.append('voice', blob, 'voicemail.webm');
    formData.append('duration_seconds', String(durationSeconds));
    return uploadFile('/broadcast/voicemails', formData).then((res) => res.data);
  },
  approveVoicemail: (id) => apiClient.put(`/broadcast/voicemails/${id}/approve`).then((res) => res.data),
  rejectVoicemail: (id, reason) => apiClient.put(`/broadcast/voicemails/${id}/reject`, { reason }).then((res) => res.data),
  sendVoicemail: (id, payload) => apiClient.post(`/broadcast/voicemails/${id}/send`, payload).then((res) => res.data)
};
