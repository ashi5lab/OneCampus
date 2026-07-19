import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { instructorModulesApi } from '../services/instructorModulesApi';

export function useInstructorModules({ enabled = true } = {}) {
  return useQuery({ queryKey: ['instructorModules'], queryFn: instructorModulesApi.list, enabled });
}

export function useCreateInstructorModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: instructorModulesApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['instructorModules'] })
  });
}

export function useRemoveInstructorModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: instructorModulesApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['instructorModules'] })
  });
}
