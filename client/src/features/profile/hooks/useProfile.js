import { useQuery, useMutation } from '@tanstack/react-query';
import { profileApi } from '../services/profileApi';

export const MY_PROFILE_KEY = ['profile', 'me'];

export function useMyProfile() {
  return useQuery({ queryKey: MY_PROFILE_KEY, queryFn: profileApi.me });
}

export function useChangePassword() {
  return useMutation({ mutationFn: profileApi.changePassword });
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
