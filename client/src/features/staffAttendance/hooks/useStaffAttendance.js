import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { staffAttendanceApi } from '../services/staffAttendanceApi';

export function useMyStaffAttendance() {
  return useQuery({ queryKey: ['staffAttendance', 'mine'], queryFn: staffAttendanceApi.mine });
}

export function useStaffAttendanceForDate(date) {
  return useQuery({
    queryKey: ['staffAttendance', 'roster', date],
    queryFn: () => staffAttendanceApi.listByDate(date),
    enabled: !!date
  });
}

export function useMarkStaffAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: staffAttendanceApi.mark,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staffAttendance'] })
  });
}
