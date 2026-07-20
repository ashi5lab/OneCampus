import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { staffApi } from '../services/staffApi';

export function useStaff({ enabled = true, filters = {} } = {}) {
  return useQuery({ queryKey: ['staff', filters], queryFn: () => staffApi.list(filters), enabled });
}

// Server-side-paginated variant for the roster page — see
// useLearnersPage's comment for why this exists alongside useStaff.
export function useStaffPage({ page = 1, pageSize = 10, filters = {} } = {}) {
  return useQuery({
    queryKey: ['staff', 'page', page, pageSize, filters],
    queryFn: () => staffApi.listPage({ ...filters, page, pageSize })
  });
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

export function useSetStaffDesignation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, designation }) => staffApi.setDesignation(id, designation),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff'] })
  });
}
