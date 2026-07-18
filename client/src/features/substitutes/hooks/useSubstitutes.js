import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { substitutesApi } from '../services/substitutesApi';

export function useSubstituteCoverage(leaveRequestId, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['substitutes', 'coverage', leaveRequestId],
    queryFn: () => substitutesApi.getCoverage(leaveRequestId),
    enabled: enabled && !!leaveRequestId
  });
}

function useInvalidatingMutation(mutationFn, leaveRequestId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['substitutes', 'coverage', leaveRequestId] })
  });
}

export function useAssignSubstitute(leaveRequestId) {
  return useInvalidatingMutation(substitutesApi.assign, leaveRequestId);
}

export function useUnassignSubstitute(leaveRequestId) {
  return useInvalidatingMutation(substitutesApi.unassign, leaveRequestId);
}
