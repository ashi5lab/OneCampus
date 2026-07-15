import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { unitsApi } from '../services/unitsApi';

export function useUnits() {
  return useQuery({ queryKey: ['units'], queryFn: unitsApi.list });
}

export function useCreateUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: unitsApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['units'] })
  });
}
