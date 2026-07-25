import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { examsApi } from '../services/examsApi';

const KEY = ['exams'];

function invalidate(qc, extraKeys = []) {
  qc.invalidateQueries({ queryKey: KEY });
  extraKeys.forEach(k => qc.invalidateQueries({ queryKey: k }));
}

export function useExams(filters = {}) {
  return useQuery({
    queryKey: [...KEY, filters],
    queryFn: () => examsApi.list(filters),
    keepPreviousData: true,
  });
}

export function useExam(id) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => examsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: examsApi.create,
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => examsApi.update(id, payload),
    onSuccess: (_, { id }) => invalidate(qc, [[...KEY, id]]),
  });
}

export function useDeleteExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: examsApi.remove,
    onSuccess: () => invalidate(qc),
  });
}

export function useDuplicateExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: examsApi.duplicate,
    onSuccess: () => invalidate(qc),
  });
}

export function useToggleExamPublish() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, published }) => examsApi.togglePublish(id, published),
    onSuccess: (_, { id }) => invalidate(qc, [[...KEY, id]]),
  });
}

export function useExamValuationStudents(examId, params = {}) {
  return useQuery({
    queryKey: [...KEY, examId, 'valuation', params],
    queryFn: () => examsApi.getValuationStudents(examId, params),
    enabled: !!examId,
    keepPreviousData: true,
  });
}

export function useUpsertExamGrade(examId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => examsApi.upsertGrade(examId, payload),
    onSuccess: (data, payload) => {
      qc.setQueriesData(
        { queryKey: [...KEY, examId, 'valuation'] },
        (oldData) => {
          if (!oldData || !oldData.students) return oldData;
          return {
            ...oldData,
            students: oldData.students.map(student => {
              if (student.learner_id === payload.learner_id) {
                return {
                  ...student,
                  score_obtained: payload.score_obtained ?? student.score_obtained,
                  grade_value: payload.grade_value ?? student.grade_value,
                  status: data.status
                };
              }
              return student;
            })
          };
        }
      );
      qc.invalidateQueries({ queryKey: [...KEY, examId], exact: true });
    },
  });
}

export function useCompleteExamValuation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: examsApi.completeValuation,
    onSuccess: (_, id) => invalidate(qc, [[...KEY, id]]),
  });
}
