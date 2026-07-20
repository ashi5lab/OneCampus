import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi } from '../services/profileApi';

export const MY_PROFILE_KEY = ['profile', 'me'];

export function useMyProfile() {
  return useQuery({ queryKey: MY_PROFILE_KEY, queryFn: profileApi.me });
}

export function useChangePassword() {
  return useMutation({ mutationFn: profileApi.changePassword });
}

const NOTIFICATION_PREFERENCES_KEY = ['profile', 'notification-preferences'];

export function useNotificationPreferences() {
  return useQuery({ queryKey: NOTIFICATION_PREFERENCES_KEY, queryFn: profileApi.getNotificationPreferences });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: profileApi.updateNotificationPreferences,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTIFICATION_PREFERENCES_KEY })
  });
}

const HOME_CARD_PREFS_KEY = ['profile', 'home-card-prefs'];

export function useHomeCardPrefs({ enabled = true } = {}) {
  return useQuery({ queryKey: HOME_CARD_PREFS_KEY, queryFn: profileApi.getHomeCardPrefs, enabled });
}

export function useUpdateHomeCardPrefs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: profileApi.updateHomeCardPrefs,
    onSuccess: (data) => queryClient.setQueryData(HOME_CARD_PREFS_KEY, data)
  });
}

// Admin-side (users.manage_passwords) — the query only runs when enabled,
// so non-admin profile pages never fire a request that would 403.
export function useAllUsers({ enabled } = { enabled: true }) {
  return useQuery({ queryKey: ['profile', 'users'], queryFn: profileApi.listUsers, enabled });
}

export function useAdminChangePassword() {
  return useMutation({
    mutationFn: ({ userId, payload }) => profileApi.adminChangePassword(userId, payload)
  });
}

export function useForceLogoutUser() {
  return useMutation({ mutationFn: (userId) => profileApi.forceLogoutUser(userId) });
}
