import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { libraryApi } from '../services/libraryApi';

export function useBooks() {
  return useQuery({ queryKey: ['library', 'books'], queryFn: libraryApi.listBooks });
}

export function useBorrowers({ enabled = true } = {}) {
  return useQuery({ queryKey: ['library', 'borrowers'], queryFn: libraryApi.listBorrowers, enabled });
}

export function useLoans() {
  return useQuery({ queryKey: ['library', 'loans'], queryFn: libraryApi.listLoans });
}

function useBooksMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['library', 'books'] })
  });
}

export function useCreateBook() {
  return useBooksMutation(libraryApi.createBook);
}

export function useUpdateBook() {
  return useBooksMutation(({ id, payload }) => libraryApi.updateBook(id, payload));
}

export function useDeleteBook() {
  return useBooksMutation(libraryApi.removeBook);
}

function useLoansMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library', 'loans'] });
      queryClient.invalidateQueries({ queryKey: ['library', 'books'] });
    }
  });
}

export function useIssueLoan() {
  return useLoansMutation(libraryApi.issueLoan);
}

export function useReturnLoan() {
  return useLoansMutation(libraryApi.returnLoan);
}

export function useWaiveFine() {
  return useLoansMutation(({ id, payload }) => libraryApi.waiveFine(id, payload));
}
