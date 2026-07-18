import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { evaluationsApi } from '../services/evaluationsApi';

export function useEvaluations() {
  return useQuery({ queryKey: ['evaluations'], queryFn: evaluationsApi.list });
}

export function useEvaluation(id) {
  return useQuery({ queryKey: ['evaluations', id], queryFn: () => evaluationsApi.get(id), enabled: !!id });
}

export function useCreateEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: evaluationsApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['evaluations'] })
  });
}

export function useSchedules(evaluationId) {
  return useQuery({
    queryKey: ['evaluations', evaluationId, 'schedules'],
    queryFn: () => evaluationsApi.listSchedules(evaluationId),
    enabled: !!evaluationId
  });
}

export function useCreateSchedule(evaluationId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => evaluationsApi.createSchedule(evaluationId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['evaluations', evaluationId, 'schedules'] })
  });
}

export function useScores(scheduleId) {
  return useQuery({
    queryKey: ['evaluations', 'schedules', scheduleId, 'scores'],
    queryFn: () => evaluationsApi.listScores(scheduleId),
    enabled: !!scheduleId
  });
}

export function useRecordScore(scheduleId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => evaluationsApi.recordScore(scheduleId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['evaluations', 'schedules', scheduleId, 'scores'] })
  });
}

export function useReportCard(evaluationId, learnerId, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['evaluations', evaluationId, 'report-card', learnerId],
    queryFn: () => evaluationsApi.getReportCard(evaluationId, learnerId),
    enabled: enabled && !!evaluationId && !!learnerId
  });
}
