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
