import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accessControlApi } from '../services/accessControlApi';

export function useAccessGroups() {
  return useQuery({ queryKey: ['access-control', 'groups'], queryFn: accessControlApi.listGroups });
}

export function useAccessControlUsers() {
  return useQuery({ queryKey: ['access-control', 'users'], queryFn: accessControlApi.listUsers });
}

export function useAllPermissions() {
  return useQuery({ queryKey: ['access-control', 'permissions'], queryFn: accessControlApi.listPermissions, staleTime: Infinity });
}

function useGroupsMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['access-control', 'groups'] })
  });
}

export function useCreateAccessGroup() {
  return useGroupsMutation(accessControlApi.createGroup);
}

export function useUpdateAccessGroup() {
  return useGroupsMutation(({ id, payload }) => accessControlApi.updateGroup(id, payload));
}

export function useDeleteAccessGroup() {
  return useGroupsMutation(accessControlApi.removeGroup);
}
