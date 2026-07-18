import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient, setAuthToken, refreshAccessToken, logoutRequest } from '../lib/apiClient';
import { isStandalone } from '../lib/pwa';

const AuthContext = createContext(null);

// Only a session running as an installed PWA (Android "Add to Home Screen"/
// desktop install, or iOS Safari's standalone mode) gets to stay signed in
// indefinitely — a regular browser tab (including mobile Chrome with the
// site just open, not installed) gets logged out after this much inactivity.
// Installed sessions still end via explicit logout, an admin revoke, or a
// password change (handled server-side, see revokeAllUserTokens).
const IDLE_TIMEOUT_MS = 20 * 60 * 1000;
const IDLE_CHECK_INTERVAL_MS = 15 * 1000;
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'wheel', 'touchstart', 'scroll'];

// A raw network failure (fetch never got a response — no `.status` on the
// error) during the mount-time session restore is NOT the same thing as "no
// valid session": Android often fully kills a backgrounded PWA's process to
// reclaim memory, so reopening it is a fresh page load that can race the OS
// still reconnecting Wi-Fi/cellular. A short, fixed retry window was still
// losing that race on real devices and bouncing users back to the login
// screen despite a perfectly valid refresh-token cookie — this waits for
// actual connectivity to come back (capped per attempt) instead of just
// sleeping blindly, and tries for longer overall before giving up.
function waitForOnlineOrTimeout(maxMs) {
  if (typeof navigator === 'undefined' || navigator.onLine !== false) {
    return new Promise((resolve) => setTimeout(resolve, maxMs));
  }
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      window.removeEventListener('online', onOnline);
      resolve();
    }, maxMs);
    function onOnline() {
      clearTimeout(timer);
      resolve();
    }
    window.addEventListener('online', onOnline, { once: true });
  });
}

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
  // Retry several times with growing, connectivity-aware backoff before
  // giving up; a genuine 401 still fails immediately with no retries.
  useEffect(() => {
    let cancelled = false;

    // Resolves with session data, or throws the final error once retries
    // (network failures only) are exhausted — callers decide what "done"
    // means, so setInitializing(false) fires exactly once, after every
    // retry attempt, not after each intermediate one.
    async function restoreSession(retriesLeft = 5, delayMs = 1000) {
      try {
        return await refreshAccessToken();
      } catch (err) {
        const isNetworkError = typeof err?.status !== 'number';
        if (isNetworkError && retriesLeft > 0 && !cancelled) {
          await waitForOnlineOrTimeout(delayMs);
          if (cancelled) throw err;
          return restoreSession(retriesLeft - 1, Math.min(delayMs * 1.6, 5000));
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

  // Idle-timeout policy: a session running as an installed PWA stays signed
  // in indefinitely (the existing behavior — ends only via explicit logout,
  // an admin revoke, or a password change). Anything else — a regular
  // browser tab, mobile Chrome with the site just open but not installed —
  // auto-logs-out after IDLE_TIMEOUT_MS of no user activity, matching a
  // conventional 20-minute web session timeout. Reading isStandalone() once
  // per session is intentional: a session doesn't change delivery mode
  // mid-flight.
  const lastActivityRef = useRef(Date.now());
  useEffect(() => {
    if (!token || isStandalone()) return;

    lastActivityRef.current = Date.now();
    const markActive = () => {
      lastActivityRef.current = Date.now();
    };

    function checkIdle() {
      if (Date.now() - lastActivityRef.current >= IDLE_TIMEOUT_MS) {
        logout();
      }
    }

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, markActive, { passive: true }));
    document.addEventListener('visibilitychange', checkIdle);
    const intervalId = setInterval(checkIdle, IDLE_CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, markActive));
      document.removeEventListener('visibilitychange', checkIdle);
      clearInterval(intervalId);
    };
  }, [token, logout]);

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
