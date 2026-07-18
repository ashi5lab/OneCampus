import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { broadcastApi } from '../services/broadcastApi';

export function useBroadcastConfigs({ enabled } = { enabled: true }) {
  return useQuery({ queryKey: ['broadcast', 'configs'], queryFn: broadcastApi.listConfigs, enabled });
}

export function useSaveBroadcastConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ channel, payload }) => broadcastApi.saveConfig(channel, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['broadcast', 'configs'] })
  });
}

export function useBroadcasts(channel) {
  return useQuery({ queryKey: ['broadcast', 'list', channel], queryFn: () => broadcastApi.list(channel) });
}

export function useBroadcastUsers({ enabled } = { enabled: true }) {
  return useQuery({ queryKey: ['broadcast', 'users'], queryFn: broadcastApi.listUsers, enabled });
}

function useInvalidatingMutation(mutationFn, channel) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['broadcast', 'list', channel] })
  });
}

export function useSendSms() {
  return useInvalidatingMutation(broadcastApi.sendSms, 'sms');
}

export function useSendWhatsapp() {
  return useInvalidatingMutation(broadcastApi.sendWhatsapp, 'whatsapp');
}

export function useSendAbsenteeAlertsNow() {
  return useInvalidatingMutation(broadcastApi.sendAbsenteeAlertsNow, 'whatsapp_absentee');
}

export function useSubmitVoicemail() {
  return useInvalidatingMutation(({ blob, durationSeconds }) => broadcastApi.submitVoicemail(blob, durationSeconds), 'voicemail');
}

export function useApproveVoicemail() {
  return useInvalidatingMutation((id) => broadcastApi.approveVoicemail(id), 'voicemail');
}

export function useRejectVoicemail() {
  return useInvalidatingMutation(({ id, reason }) => broadcastApi.rejectVoicemail(id, reason), 'voicemail');
}

export function useSendVoicemail() {
  return useInvalidatingMutation(({ id, payload }) => broadcastApi.sendVoicemail(id, payload), 'voicemail');
}
