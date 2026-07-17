import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient, setAuthToken, refreshAccessToken, logoutRequest } from '../lib/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  // { learnerId, instructorId, guardianId } — whichever applies to the
  // caller's role, null otherwise. Lets the frontend link to "my profile"
  // (see LearnerProfilePage/InstructorProfilePage) without a separate call.
  const [profile, setProfile] = useState(null);
  // 'principal' | 'vice_principal' | null — see server/lib/designation.js.
  // Lets the frontend gate principal-only actions (e.g. naming the school
  // head) without guessing from role/permissions alone.
  const [designation, setDesignation] = useState(null);
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
    setDesignation(null);
    // Wipes every cached API response (roster lists, messages, grades, ...)
    // — without this, a shared/kiosk device could flash the previous
    // user's data for an instant before the next login's queries refetch,
    // and a "logged out" device would still be sitting on stale personal
    // data in memory.
    queryClient.clear();
  }, [queryClient]);

  const refreshPermissions = useCallback(async () => {
    try {
      const res = await apiClient.get('/auth/me');
      setPermissions(res.data.permissions || []);
      setProfile(res.data.profile || null);
      setDesignation(res.data.designation || null);
    } catch {
      setPermissions([]);
      setProfile(null);
      setDesignation(null);
    }
  }, []);

  // Nothing is persisted to localStorage anymore — the only durable session
  // state is the httpOnly refresh-token cookie the browser already holds.
  // On mount, silently try to trade it for a fresh access token; if there's
  // no valid cookie (never logged in, or it expired/was revoked), this just
  // fails and the user sees the login page, exactly as if they'd never had
  // a session.
  //
  // A raw network failure (fetch never got a response at all — no `.status`
  // on the error, vs. a real 401 which does) is NOT the same thing as "no
  // valid session" and must not be treated as one: a mobile PWA relaunched
  // right after a hard-close often races the OS still reconnecting Wi-Fi/
  // cellular, so the very first request can transiently fail even though
  // the refresh-token cookie is perfectly valid. Treating that as a logout
  // was bouncing users who force-quit the app back to the login screen.
  // Retry a couple of times before giving up; a genuine 401 still fails
  // immediately with no retries.
  useEffect(() => {
    let cancelled = false;

    // Resolves with session data, or throws the final error once retries
    // (network failures only) are exhausted — callers decide what "done"
    // means, so setInitializing(false) fires exactly once, after every
    // retry attempt, not after each intermediate one.
    async function restoreSession(retriesLeft = 2) {
      try {
        return await refreshAccessToken();
      } catch (err) {
        const isNetworkError = typeof err?.status !== 'number';
        if (isNetworkError && retriesLeft > 0 && !cancelled) {
          await new Promise((resolve) => setTimeout(resolve, 1200));
          return restoreSession(retriesLeft - 1);
        }
        throw err;
      }
    }

    restoreSession()
      .then((sessionData) => {
        if (!cancelled) applySession(sessionData);
      })
      .catch(() => {
        if (!cancelled) clearSession();
      })
      .finally(() => {
        if (!cancelled) setInitializing(false);
      });

    return () => {
      cancelled = true;
    };
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
      value={{ token, user, isAuthenticated: !!token, initializing, login, logout, permissions, can, profile, designation }}
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
