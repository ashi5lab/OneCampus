import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../services/adminApi';

export function useUsersReport({ search = '', filter = 'all' } = {}) {
  return useQuery({
    queryKey: ['admin', 'users-report', search, filter],
    queryFn: () => adminApi.getUsersReport({ search, filter }),
    staleTime: 30_000
  });
}

export function useChangeUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }) => adminApi.changeUserRole(userId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users-report'] })
  });
}

export function useAssignLearnerCohort() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ learnerId, cohortId }) => adminApi.assignLearnerCohort(learnerId, cohortId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users-report'] });
      queryClient.invalidateQueries({ queryKey: ['learners'] });
    }
  });
}
