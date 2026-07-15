import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { guardiansApi } from '../services/guardiansApi';

export function useGuardians() {
  return useQuery({ queryKey: ['guardians'], queryFn: guardiansApi.list });
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
