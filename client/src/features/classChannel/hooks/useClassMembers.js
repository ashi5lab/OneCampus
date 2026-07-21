import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/apiClient';

export function useClassMembersPaginated(cohortId, query) {
  return useQuery({
    queryKey: ['class-members', cohortId, query],
    queryFn: async () => {
      const params = new URLSearchParams(query).toString();
      const res = await apiClient.get(`/class-channel/cohorts/${cohortId}/members/paginated?${params}`);
      return res;
    },
    enabled: cohortId != null
  });
}

// Reuse the instructor cohorts module logic to remove a teacher
export function useRemoveClassTeacher(cohortId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (instructorId) => {
      const res = await apiClient.delete(`/instructor-cohorts/${instructorId}/${cohortId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-members', cohortId] });
      // Invalidate the mentions list too
      queryClient.invalidateQueries({ queryKey: ['class-channel', 'members', cohortId] });
    }
  });
}

export function useAddClassTeacher(cohortId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (instructorId) => {
      const res = await apiClient.post('/instructor-cohorts', { instructor_id: instructorId, cohort_id: cohortId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-members', cohortId] });
      queryClient.invalidateQueries({ queryKey: ['class-channel', 'members', cohortId] });
    }
  });
}
