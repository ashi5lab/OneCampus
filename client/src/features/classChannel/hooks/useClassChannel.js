import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { classChannelApi } from '../services/classChannelApi';

// Every class (cohort) this caller belongs to — powers the Class tab's
// picker when there's more than one, or lets it skip straight to the
// channel when there's exactly one.
export function useMyCohorts() {
  return useQuery({ queryKey: ['class-channel', 'my-cohorts'], queryFn: classChannelApi.myCohorts });
}

export function useClassPosts(cohortId) {
  return useQuery({
    queryKey: ['class-channel', 'posts', cohortId],
    queryFn: () => classChannelApi.posts(cohortId),
    enabled: cohortId != null
  });
}

export function useCreateClassPost(cohortId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => classChannelApi.createPost(cohortId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['class-channel', 'posts', cohortId] })
  });
}

export function useCreateClassReply(cohortId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, body }) => classChannelApi.createReply(postId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['class-channel', 'posts', cohortId] })
  });
}
