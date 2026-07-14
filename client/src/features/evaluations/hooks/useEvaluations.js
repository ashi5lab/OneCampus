import { useQuery } from '@tanstack/react-query';
import { evaluationsApi } from '../services/evaluationsApi';

export function useEvaluations() {
  return useQuery({ queryKey: ['evaluations'], queryFn: evaluationsApi.list });
}
