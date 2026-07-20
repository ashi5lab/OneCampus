import { useQuery } from '@tanstack/react-query';
import { activitiesApi } from '../services/activitiesApi';

export function useActivities({ enabled = true } = {}) {
  return useQuery({ queryKey: ['activities'], queryFn: activitiesApi.list, enabled });
}
