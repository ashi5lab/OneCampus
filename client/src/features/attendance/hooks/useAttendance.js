import { useQuery } from '@tanstack/react-query';
import { attendanceApi } from '../services/attendanceApi';

export function useAttendance() {
  return useQuery({ queryKey: ['attendance'], queryFn: attendanceApi.list });
}
