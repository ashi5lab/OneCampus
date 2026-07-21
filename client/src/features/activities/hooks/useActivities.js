import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { activitiesApi } from '../services/activitiesApi';

export function useActivities({ enabled = true } = {}) {
  return useQuery({ 
    queryKey: ['activities'], 
    queryFn: async () => {
      const result = await activitiesApi.list();
      
      const globalLastViewedStr = localStorage.getItem('activitiesLastViewed');
      const globalLastViewed = globalLastViewedStr ? parseInt(globalLastViewedStr, 10) : 0;
      
      let unreadCount = 0;
      
      result.data.forEach(item => {
        let isUnread = new Date(item.ts).getTime() > globalLastViewed;
        
        if (isUnread) {
          let contextKey = null;
          if (item.type === 'mention') contextKey = `chat_${item.cohort_id}`;
          else if (item.type === 'assignment') contextKey = `assignments_${item.cohort_id}`;
          else if (item.type === 'exam') contextKey = `exams_${item.cohort_id}`;
          else if (item.type === 'attendance') contextKey = `attendance_global`;
          
          if (contextKey) {
            const contextLastViewedStr = localStorage.getItem(`activityViewed_${contextKey}`);
            if (contextLastViewedStr) {
              const contextLastViewed = parseInt(contextLastViewedStr, 10);
              if (new Date(item.ts).getTime() <= contextLastViewed) {
                isUnread = false;
              }
            }
          }
        }
        
        if (isUnread) {
          unreadCount++;
        }
      });
      
      result.recentCount = unreadCount;
      return result;
    }, 
    enabled,
    refetchInterval: 10000
  });
}

export function useMarkActivityContextViewed(contextKey) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (!contextKey) return;
    
    const timer = setTimeout(() => {
      localStorage.setItem(`activityViewed_${contextKey}`, Date.now().toString());
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    }, 1500); // 1.5s delay so user has time to actually 'see' it
    
    return () => clearTimeout(timer);
  }, [contextKey, queryClient]);
}
