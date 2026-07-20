import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { guardianLinksApi } from '../services/guardianLinksApi';

// `enabled: false` lets a caller without guardian_links.view skip the
// request entirely — see GuardiansPage/GuardianLinksModal.
export function useGuardianLinks({ enabled = true } = {}) {
  return useQuery({ queryKey: ['guardianLinks'], queryFn: guardianLinksApi.list, enabled });
}

// Also invalidates ['learners']/['guardians'] (prefix match, so it catches
// ['learners', id, 'profile'] and ['guardians', id, 'profile'] too) — those
// profile pages embed their linked guardians/learners straight from the
// same onec_learner_guardian_map join, not from useGuardianLinks() itself,
// so without this a link added/removed from either profile page only shows
// up after navigating away and back (the next mount refetches fresh).
function invalidateLinkedQueries(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['guardianLinks'] });
  queryClient.invalidateQueries({ queryKey: ['learners'] });
  queryClient.invalidateQueries({ queryKey: ['guardians'] });
}

export function useCreateGuardianLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: guardianLinksApi.create,
    onSuccess: () => invalidateLinkedQueries(queryClient)
  });
}

export function useRemoveGuardianLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: guardianLinksApi.remove,
    onSuccess: () => invalidateLinkedQueries(queryClient)
  });
}
