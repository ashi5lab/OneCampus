import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ptmApi } from '../services/ptmApi';

export function usePtmSlots() {
  return useQuery({ queryKey: ['ptm', 'slots'], queryFn: ptmApi.listSlots });
}

export function useMyLearners() {
  return useQuery({ queryKey: ['ptm', 'myLearners'], queryFn: ptmApi.myLearners });
}

function useInvalidatingMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ptm', 'slots'] })
  });
}

export function useCreateSlot() {
  return useInvalidatingMutation(ptmApi.createSlot);
}

export function useRemoveSlot() {
  return useInvalidatingMutation(ptmApi.removeSlot);
}

export function useBookSlot() {
  return useInvalidatingMutation(({ id, payload }) => ptmApi.bookSlot(id, payload));
}

export function useCancelBooking() {
  return useInvalidatingMutation(ptmApi.cancelBooking);
}
