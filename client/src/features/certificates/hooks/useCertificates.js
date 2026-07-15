import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { certificatesApi } from '../services/certificatesApi';

export function useCertificates() {
  return useQuery({ queryKey: ['certificates'], queryFn: certificatesApi.list });
}

export function useIssueCertificate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: certificatesApi.issue,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['certificates'] })
  });
}
