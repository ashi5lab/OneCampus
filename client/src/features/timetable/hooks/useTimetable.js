import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timetableApi } from '../services/timetableApi';

export function useCohortTimetable(cohortId, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['timetable', 'cohort', cohortId],
    queryFn: () => timetableApi.listForCohort(cohortId),
    enabled: enabled && !!cohortId
  });
}

export function useMyCohorts({ enabled = true } = {}) {
  return useQuery({ queryKey: ['timetable', 'my-cohorts'], queryFn: timetableApi.myCohorts, enabled });
}

export function useMyTimetable({ enabled = true } = {}) {
  return useQuery({ queryKey: ['timetable', 'mine'], queryFn: timetableApi.mine, enabled });
}

function invalidateTimetable(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['timetable'] });
}

export function useCreatePeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: timetableApi.create,
    onSuccess: () => invalidateTimetable(queryClient)
  });
}

export function useUpdatePeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => timetableApi.update(id, payload),
    onSuccess: () => invalidateTimetable(queryClient)
  });
}

export function useDeletePeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: timetableApi.remove,
    onSuccess: () => invalidateTimetable(queryClient)
  });
}
