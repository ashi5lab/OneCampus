import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bulkUploadApi } from '../services/bulkUploadApi';

// Polls every 3s only while at least one job in the list is still
// 'processing' — once every job has reached a terminal status, polling
// stops on its own (returning `false` from refetchInterval) instead of
// hammering the server forever after the admin navigates away and back.
export function useBulkUploadJobs(entityType) {
  return useQuery({
    queryKey: ['bulkUpload', 'jobs', entityType],
    queryFn: () => bulkUploadApi.listJobs(entityType),
    refetchInterval: (query) => (query.state.data?.some((job) => job.status === 'processing') ? 3000 : false)
  });
}

// On-demand fetch of a single job's full detail (including its `errors`
// array, deliberately left out of the list endpoint to keep it light) —
// used when the admin expands a row to see which rows failed and why.
export function useBulkUploadJob(id, { enabled = true } = {}) {
  return useQuery({ queryKey: ['bulkUpload', 'job', id], queryFn: () => bulkUploadApi.getJob(id), enabled: enabled && !!id });
}

export function useUploadBulkFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entityType, file }) => bulkUploadApi.upload(entityType, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bulkUpload', 'jobs'] })
  });
}
