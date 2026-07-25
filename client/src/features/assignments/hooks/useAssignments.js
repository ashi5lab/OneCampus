import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assignmentsApi } from '../services/assignmentsApi';

const KEY = ['assignments'];

function invalidate(qc, extraKeys = []) {
  qc.invalidateQueries({ queryKey: KEY });
  extraKeys.forEach(k => qc.invalidateQueries({ queryKey: k }));
}

// ─── List (server-paginated) ─────────────────────────────────────────────────
export function useAssignments(filters = {}) {
  return useQuery({
    queryKey: [...KEY, filters],
    queryFn: () => assignmentsApi.list(filters),
    keepPreviousData: true,
  });
}

// ─── Single ──────────────────────────────────────────────────────────────────
export function useAssignment(id) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => assignmentsApi.get(id),
    enabled: !!id,
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────
export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: assignmentsApi.create,
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => assignmentsApi.update(id, payload),
    onSuccess: (_, { id }) => invalidate(qc, [[...KEY, id]]),
  });
}

export function useDeleteAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: assignmentsApi.remove,
    onSuccess: () => invalidate(qc),
  });
}

export function useDuplicateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: assignmentsApi.duplicate,
    onSuccess: () => invalidate(qc),
  });
}

export function useTogglePublish() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, publish }) => assignmentsApi.togglePublish(id, publish),
    onSuccess: (_, { id }) => invalidate(qc, [[...KEY, id]]),
  });
}

// ─── Valuation ───────────────────────────────────────────────────────────────
export function useValuationStudents(assignmentId, params = {}) {
  return useQuery({
    queryKey: [...KEY, assignmentId, 'valuation', params],
    queryFn: () => assignmentsApi.getValuationStudents(assignmentId, params),
    enabled: !!assignmentId,
    keepPreviousData: true,
  });
}

export function useUpsertGrade(assignmentId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => assignmentsApi.upsertGrade(assignmentId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...KEY, assignmentId, 'valuation'] });
      qc.invalidateQueries({ queryKey: [...KEY, assignmentId] });
    },
  });
}

// ─── Learner submission hooks (self-view) ────────────────────────────────────
export function useSubmissions(assignmentId) {
  return useQuery({
    queryKey: [...KEY, assignmentId, 'submissions'],
    queryFn: () => assignmentsApi.listSubmissions(assignmentId),
    enabled: !!assignmentId,
  });
}

export function useSubmitAssignment(assignmentId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => assignmentsApi.submit(assignmentId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, assignmentId, 'submissions'] }),
  });
}

export function useCompleteValuation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: assignmentsApi.completeValuation,
    onSuccess: (_, id) => invalidate(qc, [[...KEY, id]]),
  });
}
