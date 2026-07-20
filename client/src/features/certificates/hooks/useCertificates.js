import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { certificatesApi } from '../services/certificatesApi';

export function useCertificates() {
  return useQuery({ queryKey: ['certificates'], queryFn: certificatesApi.list });
}

// Also invalidates ['learners'] (prefix match, catches
// ['learners', id, 'profile']) — a learner's Academics tab embeds
// certificates straight from onec_certificates via its own profile
// endpoint, not from useCertificates() itself, so without this a newly
// issued certificate only shows up there after navigating away and back.
export function useIssueCertificate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: certificatesApi.issue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      queryClient.invalidateQueries({ queryKey: ['learners'] });
    }
  });
}
