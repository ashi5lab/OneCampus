import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { apiClient, setAuthToken, refreshAccessToken, logoutRequest } from '../lib/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  // { learnerId, instructorId, guardianId } — whichever applies to the
  // caller's role, null otherwise. Lets the frontend link to "my profile"
  // (see LearnerProfilePage/InstructorProfilePage) without a separate call.
  const [profile, setProfile] = useState(null);
  // True until the initial silent-session-restore attempt finishes — needed
  // so ProtectedRoute doesn't redirect to /login before we've even asked
  // the server whether the httpOnly refresh-token cookie is still valid.
  const [initializing, setInitializing] = useState(true);

  const applySession = useCallback((sessionData) => {
    setAuthToken(sessionData.token);
    setToken(sessionData.token);
    setUser(sessionData.user);
  }, []);

  const clearSession = useCallback(() => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
    setPermissions([]);
    setProfile(null);
  }, []);

  const refreshPermissions = useCallback(async () => {
    try {
      const res = await apiClient.get('/auth/me');
      setPermissions(res.data.permissions || []);
      setProfile(res.data.profile || null);
    } catch {
      setPermissions([]);
      setProfile(null);
    }
  }, []);

  // Nothing is persisted to localStorage anymore — the only durable session
  // state is the httpOnly refresh-token cookie the browser already holds.
  // On mount, silently try to trade it for a fresh access token; if there's
  // no valid cookie (never logged in, or it expired/was revoked), this just
  // fails and the user sees the login page, exactly as if they'd never had
  // a session.
  useEffect(() => {
    refreshAccessToken()
      .then((sessionData) => applySession(sessionData))
      .catch(() => clearSession())
      .finally(() => setInitializing(false));
  }, [applySession, clearSession]);

  useEffect(() => {
    if (token) refreshPermissions();
  }, [token, refreshPermissions]);

  const login = useCallback(
    async (username, password) => {
      const res = await apiClient.post('/auth/login', { username, password });
      applySession(res.data);
      return res.data.user;
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    await logoutRequest();
    clearSession();
  }, [clearSession]);

  const can = useCallback((permission) => permissions.includes(permission), [permissions]);

  return (
    <AuthContext.Provider
      value={{ token, user, isAuthenticated: !!token, initializing, login, logout, permissions, can, profile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
