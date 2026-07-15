import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi } from '../services/attendanceApi';

export function useAttendance() {
  return useQuery({ queryKey: ['attendance'], queryFn: attendanceApi.list });
}

export function useAttendanceForCohortDate(cohortId, date) {
  return useQuery({
    queryKey: ['attendance', 'roster', cohortId, date],
    queryFn: () => attendanceApi.listByCohortDate(cohortId, date),
    enabled: !!cohortId && !!date
  });
}

export function useMarkAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: attendanceApi.mark,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance'] })
  });
}
