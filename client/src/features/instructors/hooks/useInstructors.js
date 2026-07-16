import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { instructorsApi } from '../services/instructorsApi';

// `enabled: false` lets a caller without instructors.view skip the request
// entirely (it would just 403) — see DashboardPage. `filters`
// (search/gender) are forwarded to the query string.
export function useInstructors({ enabled = true, filters = {} } = {}) {
  return useQuery({ queryKey: ['instructors', filters], queryFn: () => instructorsApi.list(filters), enabled });
}

export function useCreateInstructor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: instructorsApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['instructors'] })
  });
}

export function useUpdateInstructor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => instructorsApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['instructors'] })
  });
}

export function useDeleteInstructor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: instructorsApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['instructors'] })
  });
}

export function useInstructorProfile(id) {
  return useQuery({
    queryKey: ['instructors', id, 'profile'],
    queryFn: () => instructorsApi.getProfile(id),
    enabled: id !== undefined && id !== null
  });
}
