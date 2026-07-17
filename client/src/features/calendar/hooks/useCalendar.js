import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { calendarApi } from '../services/calendarApi';

export function useAgenda(from, to, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['calendar', 'agenda', from, to],
    queryFn: () => calendarApi.agenda(from, to),
    enabled: enabled && !!from && !!to
  });
}

// Raw, unexpanded rows — for the admin management list (edit/delete a
// recurrence rule itself, not one occurrence of it).
export function useCalendarEvents({ enabled = true } = {}) {
  return useQuery({ queryKey: ['calendar', 'events'], queryFn: calendarApi.listEvents, enabled });
}

function invalidateCalendar(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['calendar'] });
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: calendarApi.create,
    onSuccess: () => invalidateCalendar(queryClient)
  });
}

export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => calendarApi.update(id, payload),
    onSuccess: () => invalidateCalendar(queryClient)
  });
}

export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: calendarApi.remove,
    onSuccess: () => invalidateCalendar(queryClient)
  });
}
