import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { disciplineApi } from '../services/disciplineApi';

export function useDisciplineRecords(learnerId) {
  return useQuery({ queryKey: ['discipline', learnerId || 'all'], queryFn: () => disciplineApi.list({ learner_id: learnerId }) });
}

export function useDisciplineRecordsPage({ page = 1, pageSize = 10, filters = {} } = {}) {
  return useQuery({
    queryKey: ['discipline', 'page', page, pageSize, filters],
    queryFn: () => disciplineApi.listPage({ ...filters, page, pageSize })
  });
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

export function useUpdateDisciplineRecord() {
  return useInvalidatingMutation(({ id, payload }) => disciplineApi.update(id, payload));
}

export function useDeleteDisciplineRecord() {
  return useInvalidatingMutation(disciplineApi.remove);
}
