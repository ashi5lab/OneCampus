import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { unitsApi } from '../services/unitsApi';

// `enabled: false` lets a caller without units.view skip the request
// entirely (it would just 403) instead of firing it and discarding the
// error — see ModulesPage.
export function useUnits({ enabled = true } = {}) {
  return useQuery({ queryKey: ['units'], queryFn: unitsApi.list, enabled });
}

export function useCreateUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: unitsApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['units'] })
  });
}

export function useUpdateUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => unitsApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['units'] })
  });
}

export function useDeleteUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: unitsApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['units'] })
  });
}
