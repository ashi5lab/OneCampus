import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { staffApi } from '../services/staffApi';

export function useStaff({ enabled = true, filters = {} } = {}) {
  return useQuery({ queryKey: ['staff', filters], queryFn: () => staffApi.list(filters), enabled });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: staffApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff'] })
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => staffApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff'] })
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: staffApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff'] })
  });
}
