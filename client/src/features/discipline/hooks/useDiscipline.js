import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { disciplineApi } from '../services/disciplineApi';

export function useDisciplineRecords(learnerId) {
  return useQuery({ queryKey: ['discipline', learnerId || 'all'], queryFn: () => disciplineApi.list(learnerId) });
}

function useInvalidatingMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['discipline'] })
  });
}

export function useCreateDisciplineRecord() {
  return useInvalidatingMutation(disciplineApi.create);
}

export function useDeleteDisciplineRecord() {
  return useInvalidatingMutation(disciplineApi.remove);
}
