import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { classChannelApi } from '../services/classChannelApi';
import { useSocket } from '../../../contexts/SocketContext';

// Every class (cohort) this caller belongs to — powers the Class tab's
// picker when there's more than one, or lets it skip straight to the
// channel when there's exactly one.
export function useMyCohorts() {
  return useQuery({ queryKey: ['class-channel', 'my-cohorts'], queryFn: classChannelApi.myCohorts });
}

// The class roster, for the @mention picker.
export function useClassMembers(cohortId) {
  return useQuery({
    queryKey: ['class-channel', 'members', cohortId],
    queryFn: () => classChannelApi.members(cohortId),
    enabled: cohortId != null
  });
}

// Resolves to { data: [...posts], canModerate: boolean } — canModerate
// gates the edit-history link and the delete-any-message/pin actions in
// the UI (the endpoints re-check server-side regardless).
export function useClassPosts(cohortId) {
  const queryClient = useQueryClient();
  const socket = useSocket();
  const query = useQuery({
    queryKey: ['class-channel', 'posts', cohortId],
    queryFn: () => classChannelApi.posts(cohortId),
    enabled: cohortId != null
  });

  useEffect(() => {
    if (!socket || !cohortId) return;

    socket.emit('join_class', cohortId);

    const handleNewPost = (post) => {
      queryClient.setQueryData(['class-channel', 'posts', cohortId], (oldData) => {
        if (!oldData || !oldData.data) return oldData;
        if (oldData.data.some(p => p.id === post.id)) return oldData;
        return { ...oldData, data: [...oldData.data, post] };
      });
    };

    const handleNewReply = (reply) => {
      queryClient.setQueryData(['class-channel', 'posts', cohortId], (oldData) => {
        if (!oldData || !oldData.data) return oldData;
        return {
          ...oldData,
          data: oldData.data.map(post => {
            if (post.id === reply.post_id) {
              if (post.replies.some(r => r.id === reply.id)) return post;
              return { ...post, replies: [...post.replies, reply] };
            }
            return post;
          })
        };
      });
    };

    socket.on('new_post', handleNewPost);
    socket.on('new_reply', handleNewReply);

    return () => {
      socket.off('new_post', handleNewPost);
      socket.off('new_reply', handleNewReply);
      socket.emit('leave_class', cohortId);
    };
  }, [socket, cohortId, queryClient]);

  return query;
}

function invalidatePosts(queryClient, cohortId) {
  return queryClient.invalidateQueries({ queryKey: ['class-channel', 'posts', cohortId] });
}

export function useCreateClassPost(cohortId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => classChannelApi.createPost(cohortId, payload),
    onSuccess: () => invalidatePosts(queryClient, cohortId)
  });
}

export function useCreateClassReply(cohortId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, ...payload }) => classChannelApi.createReply(postId, payload),
    onSuccess: () => invalidatePosts(queryClient, cohortId)
  });
}

export function useEditPost(cohortId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => classChannelApi.editPost(id, body),
    onSuccess: () => invalidatePosts(queryClient, cohortId)
  });
}

export function useEditReply(cohortId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => classChannelApi.editReply(id, body),
    onSuccess: () => invalidatePosts(queryClient, cohortId)
  });
}

// On-demand, not prefetched — only fires while the edit-history modal for
// this specific message is open (see `enabled`).
export function useEditHistory(kind, id, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['class-channel', 'edits', kind, id],
    queryFn: () => (kind === 'post' ? classChannelApi.getPostEditHistory(id) : classChannelApi.getReplyEditHistory(id)),
    enabled: enabled && id != null
  });
}

export function useDeletePost(cohortId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => classChannelApi.deletePost(id),
    onSuccess: () => invalidatePosts(queryClient, cohortId)
  });
}

export function useDeleteReply(cohortId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => classChannelApi.deleteReply(id),
    onSuccess: () => invalidatePosts(queryClient, cohortId)
  });
}

export function useSetReaction(cohortId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, emoji }) => classChannelApi.setReaction(postId, emoji),
    onSuccess: () => invalidatePosts(queryClient, cohortId)
  });
}

export function usePinPost(cohortId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId) => classChannelApi.pinPost(cohortId, postId),
    onSuccess: () => invalidatePosts(queryClient, cohortId)
  });
}

export function useUnpinPost(cohortId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => classChannelApi.unpinPost(cohortId),
    onSuccess: () => invalidatePosts(queryClient, cohortId)
  });
}
