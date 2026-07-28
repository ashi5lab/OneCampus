import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children }) {
  const { isAuthenticated, initializing } = useAuth();
  const location = useLocation();

  // Still waiting on the silent session-restore attempt (see AuthContext) —
  // redirecting to /login here would incorrectly bounce an already-logged-in
  // user on every page reload, before we've even asked the server.
  // Show a full-screen splash instead of null so users don't see a flash
  // of the login screen while the refresh-token call is in-flight.
  if (initializing) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        background: '#0f172a',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 56,
            height: 56,
            border: '4px solid rgba(99,102,241,0.2)',
            borderTopColor: '#6366f1',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: '#94a3b8', fontSize: 14, fontFamily: 'system-ui, sans-serif' }}>Loading…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/" state={{ from: location }} replace />;
  return children;
}
