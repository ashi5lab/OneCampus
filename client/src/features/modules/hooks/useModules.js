import { useQuery } from '@tanstack/react-query';
import { modulesApi } from '../services/modulesApi';

export function useModules() {
  return useQuery({ queryKey: ['modules'], queryFn: modulesApi.list });
}
