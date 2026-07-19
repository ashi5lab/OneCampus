import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { instructorCohortsApi } from '../services/instructorCohortsApi';

export function useInstructorCohorts({ enabled = true } = {}) {
  return useQuery({ queryKey: ['instructorCohorts'], queryFn: instructorCohortsApi.list, enabled });
}

export function useCreateInstructorCohort() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: instructorCohortsApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['instructorCohorts'] })
  });
}

export function useRemoveInstructorCohort() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: instructorCohortsApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['instructorCohorts'] })
  });
}
