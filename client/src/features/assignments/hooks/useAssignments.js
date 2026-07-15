import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assignmentsApi } from '../services/assignmentsApi';

export function useAssignments() {
  return useQuery({ queryKey: ['assignments'], queryFn: assignmentsApi.list });
}

function useAssignmentsMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assignments'] })
  });
}

export function useCreateAssignment() {
  return useAssignmentsMutation(assignmentsApi.create);
}

export function useUpdateAssignment() {
  return useAssignmentsMutation(({ id, payload }) => assignmentsApi.update(id, payload));
}

export function useDeleteAssignment() {
  return useAssignmentsMutation(assignmentsApi.remove);
}

export function useSubmissions(assignmentId) {
  return useQuery({
    queryKey: ['assignments', assignmentId, 'submissions'],
    queryFn: () => assignmentsApi.listSubmissions(assignmentId),
    enabled: assignmentId !== undefined && assignmentId !== null
  });
}

export function useSubmitAssignment(assignmentId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => assignmentsApi.submit(assignmentId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assignments', assignmentId, 'submissions'] })
  });
}

export function useGradeSubmission(assignmentId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ submissionId, payload }) => assignmentsApi.grade(submissionId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assignments', assignmentId, 'submissions'] })
  });
}
