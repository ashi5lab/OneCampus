import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { apiClient, setAuthToken } from '../lib/apiClient';

const AuthContext = createContext(null);
const TOKEN_STORAGE_KEY = 'onecampus.token';
const USER_STORAGE_KEY = 'onecampus.user';

function loadStoredSession() {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  const rawUser = localStorage.getItem(USER_STORAGE_KEY);
  if (!token || !rawUser) return { token: null, user: null };
  try {
    return { token, user: JSON.parse(rawUser) };
  } catch {
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }) {
  const [{ token, user }, setSession] = useState(() => {
    const stored = loadStoredSession();
    setAuthToken(stored.token);
    return stored;
  });
  // Not persisted to localStorage — always fetched fresh from /auth/me so a
  // tenant admin's onec_role_permissions change takes effect on next load
  // without the user needing to log out/in.
  const [permissions, setPermissions] = useState([]);

  const refreshPermissions = useCallback(async () => {
    try {
      const res = await apiClient.get('/auth/me');
      setPermissions(res.data.permissions || []);
    } catch {
      setPermissions([]);
    }
  }, []);

  useEffect(() => {
    if (token) refreshPermissions();
  }, [token, refreshPermissions]);

  const login = useCallback(async (username, password) => {
    const res = await apiClient.post('/auth/login', { username, password });
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
    setAuthToken(newToken);
    setSession({ token: newToken, user: newUser });
    return newUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setAuthToken(null);
    setSession({ token: null, user: null });
    setPermissions([]);
  }, []);

  const can = useCallback((permission) => permissions.includes(permission), [permissions]);

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated: !!token, login, logout, permissions, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
