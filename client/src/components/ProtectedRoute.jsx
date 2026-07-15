import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children }) {
  const { isAuthenticated, initializing } = useAuth();
  const location = useLocation();

  // Still waiting on the silent session-restore attempt (see AuthContext) —
  // redirecting to /login here would incorrectly bounce an already-logged-in
  // user on every page reload, before we've even asked the server.
  if (initializing) return null;

  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}
