import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { superAdminApi } from '../services/superAdminApi';

export function useSuperAdminTenants(status) {
  return useQuery({
    queryKey: ['super-admin', 'tenants', status || 'all'],
    queryFn: () => superAdminApi.listTenants(status)
  });
}

function useTenantMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenants'] })
  });
}

export function useApproveTenant() {
  return useTenantMutation((id) => superAdminApi.approveTenant(id));
}

export function useDeclineTenant() {
  return useTenantMutation(({ id, reason }) => superAdminApi.declineTenant(id, reason));
}

export function useUpdateTenant() {
  return useTenantMutation(({ id, payload }) => superAdminApi.updateTenant(id, payload));
}

export function useDeleteTenant() {
  return useTenantMutation((id) => superAdminApi.deleteTenant(id));
}
