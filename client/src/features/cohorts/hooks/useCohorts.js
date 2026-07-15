import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cohortsApi } from '../services/cohortsApi';

// `enabled: false` lets a caller without cohorts.view skip the request
// entirely (it would just 403) — see DashboardPage.
export function useCohorts({ enabled = true } = {}) {
  return useQuery({ queryKey: ['cohorts'], queryFn: cohortsApi.list, enabled });
}

export function useCreateCohort() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cohortsApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cohorts'] })
  });
}

export function useUpdateCohort() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => cohortsApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cohorts'] })
  });
}

export function useDeleteCohort() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cohortsApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cohorts'] })
  });
}
