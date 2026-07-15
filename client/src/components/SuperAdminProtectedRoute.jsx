import { Navigate } from 'react-router-dom';
import { useSuperAdminAuth } from '../contexts/SuperAdminAuthContext';

export function SuperAdminProtectedRoute({ children }) {
  const { isAuthenticated, initializing } = useSuperAdminAuth();

  if (initializing) return null;
  if (!isAuthenticated) return <Navigate to="/super-admin/login" replace />;
  return children;
}
