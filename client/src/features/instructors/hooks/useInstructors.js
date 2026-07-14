import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { instructorsApi } from '../services/instructorsApi';

export function useInstructors() {
  return useQuery({ queryKey: ['instructors'], queryFn: instructorsApi.list });
}

export function useCreateInstructor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: instructorsApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['instructors'] })
  });
}
