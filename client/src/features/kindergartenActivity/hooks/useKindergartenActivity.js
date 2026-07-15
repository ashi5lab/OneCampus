import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kindergartenActivityApi } from '../services/kindergartenActivityApi';

export function useKindergartenActivity() {
  return useQuery({ queryKey: ['kindergarten-activity'], queryFn: kindergartenActivityApi.list });
}

export function useLogActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: kindergartenActivityApi.log,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kindergarten-activity'] })
  });
}
