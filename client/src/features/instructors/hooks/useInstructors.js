import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { instructorsApi } from '../services/instructorsApi';

// `enabled: false` lets a caller without instructors.view skip the request
// entirely (it would just 403) — see DashboardPage.
export function useInstructors({ enabled = true } = {}) {
  return useQuery({ queryKey: ['instructors'], queryFn: instructorsApi.list, enabled });
}

export function useCreateInstructor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: instructorsApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['instructors'] })
  });
}
