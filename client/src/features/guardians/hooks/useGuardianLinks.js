import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { guardianLinksApi } from '../services/guardianLinksApi';

// `enabled: false` lets a caller without guardian_links.view skip the
// request entirely — see GuardiansPage/GuardianLinksModal.
export function useGuardianLinks({ enabled = true } = {}) {
  return useQuery({ queryKey: ['guardianLinks'], queryFn: guardianLinksApi.list, enabled });
}

export function useCreateGuardianLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: guardianLinksApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guardianLinks'] })
  });
}

export function useRemoveGuardianLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: guardianLinksApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guardianLinks'] })
  });
}
