import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { noticesApi } from '../services/noticesApi';

export function useNotices({ enabled = true } = {}) {
  return useQuery({ queryKey: ['notices'], queryFn: noticesApi.list, enabled });
}

export function useCreateNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: noticesApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notices'] })
  });
}

export function useUpdateNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => noticesApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notices'] })
  });
}

export function useDeleteNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: noticesApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notices'] })
  });
}
