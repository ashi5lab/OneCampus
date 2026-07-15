import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { onlineExamsApi } from '../services/onlineExamsApi';

export function useOnlineExams() {
  return useQuery({ queryKey: ['online-exams'], queryFn: onlineExamsApi.list });
}

export function useOnlineExam(id) {
  return useQuery({
    queryKey: ['online-exams', id],
    queryFn: () => onlineExamsApi.get(id),
    enabled: id !== undefined && id !== null
  });
}

function useExamsMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['online-exams'] })
  });
}

export function useCreateOnlineExam() {
  return useExamsMutation(onlineExamsApi.create);
}

export function useUpdateOnlineExam() {
  return useExamsMutation(({ id, payload }) => onlineExamsApi.update(id, payload));
}

export function useDeleteOnlineExam() {
  return useExamsMutation(onlineExamsApi.remove);
}

export function usePublishOnlineExam() {
  return useExamsMutation(({ id, published }) => onlineExamsApi.publish(id, published));
}

// --- Taking an exam ---

export function useStartExam(examId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => onlineExamsApi.start(examId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['online-exams', examId, 'my-submission'] })
  });
}

export function useMySubmission(examId) {
  return useQuery({
    queryKey: ['online-exams', examId, 'my-submission'],
    queryFn: () => onlineExamsApi.mySubmission(examId),
    enabled: examId !== undefined && examId !== null
  });
}

export function useSubmitExam(examId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => onlineExamsApi.submit(examId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online-exams', examId, 'my-submission'] });
      queryClient.invalidateQueries({ queryKey: ['online-exams'] });
    }
  });
}

// --- Grading ---

export function useExamSubmissions(examId) {
  return useQuery({
    queryKey: ['online-exams', examId, 'submissions'],
    queryFn: () => onlineExamsApi.listSubmissions(examId),
    enabled: examId !== undefined && examId !== null
  });
}

export function useExamSubmissionDetail(submissionId) {
  return useQuery({
    queryKey: ['online-exams', 'submissions', submissionId],
    queryFn: () => onlineExamsApi.getSubmission(submissionId),
    enabled: submissionId !== undefined && submissionId !== null
  });
}

export function useGradeExamSubmission(examId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ submissionId, payload }) => onlineExamsApi.grade(submissionId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['online-exams', examId, 'submissions'] })
  });
}
