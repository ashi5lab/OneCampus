import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { learnersApi } from '../services/learnersApi';

// `enabled: false` lets a caller without learners.view skip the request
// entirely (it would just 403) instead of firing it and discarding the
// error — see CertificatesPage/KindergartenActivityPage.
export function useLearners({ enabled = true } = {}) {
  return useQuery({ queryKey: ['learners'], queryFn: learnersApi.list, enabled });
}

export function useCreateLearner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: learnersApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['learners'] })
  });
}

export function useUpdateLearner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => learnersApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['learners'] })
  });
}

export function useDeleteLearner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: learnersApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['learners'] })
  });
}
