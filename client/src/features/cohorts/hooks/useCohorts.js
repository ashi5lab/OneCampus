import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cohortsApi } from '../services/cohortsApi';

export function useCohorts() {
  return useQuery({ queryKey: ['cohorts'], queryFn: cohortsApi.list });
}

export function useCreateCohort() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cohortsApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cohorts'] })
  });
}
