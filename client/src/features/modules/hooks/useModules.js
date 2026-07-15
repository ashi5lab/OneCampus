import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { modulesApi } from '../services/modulesApi';

// `enabled: false` lets a caller without modules.view skip the request
// entirely (it would just 403) instead of firing it and discarding the
// error — see EvaluationDetailPage.
export function useModules({ enabled = true } = {}) {
  return useQuery({ queryKey: ['modules'], queryFn: modulesApi.list, enabled });
}

export function useCreateModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: modulesApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['modules'] })
  });
}
