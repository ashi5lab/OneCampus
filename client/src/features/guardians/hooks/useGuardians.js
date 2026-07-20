import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { guardiansApi } from '../services/guardiansApi';

export function useGuardians() {
  return useQuery({ queryKey: ['guardians'], queryFn: guardiansApi.list });
}

// Server-side-paginated variant for the roster page — see
// useLearnersPage's comment for why this exists alongside useGuardians.
export function useGuardiansPage({ page = 1, pageSize = 10 } = {}) {
  return useQuery({
    queryKey: ['guardians', 'page', page, pageSize],
    queryFn: () => guardiansApi.listPage({ page, pageSize })
  });
}

export function useCreateGuardian() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: guardiansApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guardians'] })
  });
}

export function useUpdateGuardian() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => guardiansApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guardians'] })
  });
}

export function useDeleteGuardian() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: guardiansApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guardians'] })
  });
}

export function useGuardianProfile(id) {
  return useQuery({
    queryKey: ['guardians', id, 'profile'],
    queryFn: () => guardiansApi.getProfile(id),
    enabled: id !== undefined && id !== null
  });
}
