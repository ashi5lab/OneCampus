import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../services/reportsApi';

export function useDashboardReport() {
  return useQuery({ queryKey: ['reports', 'dashboard'], queryFn: reportsApi.dashboard });
}

export function useAnalyticsReport() {
  return useQuery({ queryKey: ['reports', 'analytics'], queryFn: reportsApi.analytics });
}

export function useOverviewReport() {
  return useQuery({ queryKey: ['reports', 'overview'], queryFn: reportsApi.overview });
}

export function useTodayReport() {
  return useQuery({ queryKey: ['reports', 'today'], queryFn: reportsApi.today, refetchInterval: 60000 });
}

export function useClassWiseReport(params) {
  return useQuery({ queryKey: ['reports', 'class-wise', params], queryFn: () => reportsApi.classWise(params) });
}

export function useStudentSearch(params) {
  return useQuery({
    queryKey: ['reports', 'student-search', params],
    queryFn: () => reportsApi.studentSearch(params),
    enabled: (params?.q?.length >= 2) || false
  });
}

export function useAttendanceReport(params) {
  return useQuery({ queryKey: ['reports', 'attendance', params], queryFn: () => reportsApi.attendance(params) });
}

export function useAcademicPerformanceReport(params) {
  return useQuery({ queryKey: ['reports', 'academic-performance', params], queryFn: () => reportsApi.academicPerformance(params) });
}

export function useAssignmentsReport() {
  return useQuery({ queryKey: ['reports', 'assignments'], queryFn: reportsApi.assignments });
}

export function useOnlineExamsReport() {
  return useQuery({ queryKey: ['reports', 'online-exams'], queryFn: reportsApi.onlineExams });
}

export function useLibraryReport() {
  return useQuery({ queryKey: ['reports', 'library'], queryFn: reportsApi.library });
}

export function useCertificatesReport() {
  return useQuery({ queryKey: ['reports', 'certificates'], queryFn: reportsApi.certificates });
}
