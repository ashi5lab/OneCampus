import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messagesApi } from '../services/messagesApi';

export function useInbox() {
  return useQuery({ queryKey: ['messages', 'inbox'], queryFn: messagesApi.inbox });
}

export function useSentMessages() {
  return useQuery({ queryKey: ['messages', 'sent'], queryFn: messagesApi.sent });
}

// Polled — there's no push/websocket layer here, a 30s interval is enough
// for a sidebar unread badge to feel reasonably live without adding
// real-time infrastructure for v1. `enabled: false` lets the Sidebar skip
// the request entirely for a role/tenant without messaging access, the
// same pattern as e.g. useLearners.
export function useUnreadCount({ enabled = true } = {}) {
  return useQuery({
    queryKey: ['messages', 'unread-count'],
    queryFn: messagesApi.unreadCount,
    refetchInterval: 30000,
    enabled
  });
}

export function useRecipients() {
  return useQuery({ queryKey: ['messages', 'recipients'], queryFn: messagesApi.recipients });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: messagesApi.send,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages', 'sent'] })
  });
}

export function useMarkMessageRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: messagesApi.markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', 'inbox'] });
      queryClient.invalidateQueries({ queryKey: ['messages', 'unread-count'] });
    }
  });
}
