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

// Also invalidates ['learners']/['instructors'] (prefix match, catches
// ['learners', id, 'profile']/['instructors', id, 'profile']) — a
// learner's Attendance tab and an instructor's Recent Activity tab both
// embed attendance straight from the same table via their own profile
// endpoint, not from useAttendance() itself, so without this a mark only
// shows up there after navigating away and back.
export function useMarkAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: attendanceApi.mark,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['learners'] });
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
    }
  });
}
