import { useQuery } from '@tanstack/react-query';
import { activitiesApi } from '../services/activitiesApi';

export function useActivities({ enabled = true } = {}) {
  return useQuery({ 
    queryKey: ['activities'], 
    queryFn: async () => {
      const result = await activitiesApi.list();
      const lastViewed = localStorage.getItem('activitiesLastViewed');
      if (lastViewed) {
        const lastViewedTs = parseInt(lastViewed, 10);
        result.recentCount = result.data.filter(item => new Date(item.ts).getTime() > lastViewedTs).length;
      }
      return result;
    }, 
    enabled 
  });
}
