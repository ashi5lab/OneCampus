import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { learnersApi } from '../services/learnersApi';

// `enabled: false` lets a caller without learners.view skip the request
// entirely (it would just 403) instead of firing it and discarding the
// error — see CertificatesPage/KindergartenActivityPage. `filters`
// (search/cohort_id/gender/status) are forwarded straight to the query
// string; omitted/empty ones are dropped by learnersApi's withQuery.
export function useLearners({ enabled = true, filters = {} } = {}) {
  return useQuery({ queryKey: ['learners', filters], queryFn: () => learnersApi.list(filters), enabled });
}

// Server-side-paginated variant for the roster page — only fetches the
// current page's rows instead of the whole tenant's student list (see
// DataTable's serverPagination prop). Keep useLearners() above for every
// other caller (search pickers, link modals) that genuinely needs the
// full list to search/select from.
export function useLearnersPage({ page = 1, pageSize = 10, filters = {} } = {}) {
  return useQuery({
    queryKey: ['learners', 'page', page, pageSize, filters],
    queryFn: () => learnersApi.listPage({ ...filters, page, pageSize })
  });
}

export function useCreateLearner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: learnersApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['learners'] })
  });
}

export function useUpdateLearner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => learnersApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['learners'] })
  });
}

export function useDeleteLearner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: learnersApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['learners'] })
  });
}

export function useSetClassHead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_class_head }) => learnersApi.setClassHead(id, is_class_head),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['learners'] })
  });
}

export function useSetSchoolHead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_school_head }) => learnersApi.setSchoolHead(id, is_school_head),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['learners'] })
  });
}

export function useLearnerProfile(id) {
  return useQuery({
    queryKey: ['learners', id, 'profile'],
    queryFn: () => learnersApi.getProfile(id),
    enabled: id !== undefined && id !== null
  });
}
