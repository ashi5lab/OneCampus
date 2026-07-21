import { Navigate } from 'react-router-dom';
import { useSuperAdminAuth } from '../contexts/SuperAdminAuthContext';

export function SuperAdminProtectedRoute({ children }) {
  const { isAuthenticated, initializing } = useSuperAdminAuth();

  if (initializing) return null;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return children;
}
