import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getSuperAdminToken, setSuperAdminToken } from '../lib/superAdminApiClient';
import { superAdminApi } from '../features/superAdmin/services/superAdminApi';

const SuperAdminAuthContext = createContext(null);

// Separate from AuthContext (tenant users) on purpose — a super admin isn't
// a tenant user and authenticates against a different table/token scope
// (see server/modules/platform). Scoped to the /super-admin route subtree
// in App.jsx, not mounted globally, so it only does work when someone is
// actually in the super admin area.
export function SuperAdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const token = getSuperAdminToken();
    if (!token) {
      setInitializing(false);
      return;
    }
    superAdminApi
      .me()
      .then((data) => setAdmin(data))
      .catch(() => setSuperAdminToken(null))
      .finally(() => setInitializing(false));
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await superAdminApi.login({ username, password });
    setSuperAdminToken(data.token);
    setAdmin(data.admin);
    return data.admin;
  }, []);

  const logout = useCallback(() => {
    setSuperAdminToken(null);
    setAdmin(null);
  }, []);

  return (
    <SuperAdminAuthContext.Provider
      value={{ admin, isAuthenticated: !!admin, initializing, login, logout }}
    >
      {children}
    </SuperAdminAuthContext.Provider>
  );
}

export function useSuperAdminAuth() {
  const ctx = useContext(SuperAdminAuthContext);
  if (!ctx) throw new Error('useSuperAdminAuth must be used within SuperAdminAuthProvider');
  return ctx;
}
