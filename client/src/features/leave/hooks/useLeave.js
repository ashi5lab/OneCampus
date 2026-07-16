import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveApi } from '../services/leaveApi';

export function useMyLeave({ enabled = true } = {}) {
  return useQuery({ queryKey: ['leave', 'mine'], queryFn: leaveApi.listMine, enabled });
}

// The approval queue — already row-scoped server-side to whatever this
// caller may act on (see server/modules/leave/controller.js's
// getApproverScope), so no client-side filtering is needed here.
export function useLeaveQueue({ enabled = true } = {}) {
  return useQuery({ queryKey: ['leave', 'queue'], queryFn: leaveApi.listQueue, enabled });
}

function invalidateLeave(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['leave'] });
}

export function useApplyLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: leaveApi.apply,
    onSuccess: () => invalidateLeave(queryClient)
  });
}

export function useReviewLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => leaveApi.review(id, payload),
    onSuccess: () => invalidateLeave(queryClient)
  });
}

export function useCancelLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: leaveApi.cancel,
    onSuccess: () => invalidateLeave(queryClient)
  });
}
