import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { learnersApi } from '../services/learnersApi';

export function useLearners() {
  return useQuery({ queryKey: ['learners'], queryFn: learnersApi.list });
}

export function useCreateLearner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: learnersApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['learners'] })
  });
}
