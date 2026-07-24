import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi } from '../services/attendanceApi';

export function useAttendance(page, pageSize) {
  return useQuery({
    queryKey: ['attendance', page, pageSize],
    queryFn: () => attendanceApi.list(page, pageSize)
  });
}

export function useAttendanceForCohortDate(cohortId, date, page, pageSize) {
  return useQuery({
    queryKey: ['attendance', 'roster', cohortId, date, page, pageSize],
    queryFn: () => attendanceApi.listByCohortDate(cohortId, date, page, pageSize),
    enabled: !!cohortId && !!date
  });
}

// Class-wise absent/late report for a single day. cohortIds = [] means all
// classes. Backend row-scopes for non-admins (see attendance controller).
export function useAbsenteeReport(date, cohortIds = []) {
  return useQuery({
    queryKey: ['attendance', 'absentee-report', date, [...cohortIds].sort()],
    queryFn: () => attendanceApi.absenteeReport(date, cohortIds),
    enabled: !!date
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
