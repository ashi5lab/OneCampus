import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { visitorsApi } from '../services/visitorsApi';

export function useVisitors({ filters = {} } = {}) {
  return useQuery({ queryKey: ['visitors', filters], queryFn: () => visitorsApi.list(filters) });
}

export function useCheckInVisitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: visitorsApi.checkIn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['visitors'] })
  });
}

export function useCheckOutVisitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: visitorsApi.checkOut,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['visitors'] })
  });
}
