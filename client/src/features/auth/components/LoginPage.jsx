import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useConfig } from '../../../contexts/ConfigContext';
import { InstallAppPrompt } from '../../../components/InstallAppPrompt';
import { superAdminApi } from '../../superAdmin/services/superAdminApi';
import { setSuperAdminToken } from '../../../lib/superAdminApiClient';

export function LoginPage() {
  const { login, logout, isAuthenticated, initializing } = useAuth();
  const { config, reloadConfig } = useConfig();

  // If a user navigates to the login page while already authenticated,
  // clear the session to avoid stale data being shown.
  // On first render, if the user is already authenticated we clear the session to avoid stale data.
  // This runs only once (on mount) and will not fire after a successful login.
  useEffect(() => {
    if (isAuthenticated) {
      logout();
    }
  }, []);
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = location.state?.from?.pathname || '/app';

  // The installed PWA icon frequently reopens straight to /login (whatever
  // page "Add to Home Screen" was tapped from — often this exact page,
  // since the install button lives here), not the manifest's start_url.
  // AuthContext already silently redeemed the httpOnly refresh-token
  // cookie by the time `initializing` flips false; without this, a
  // perfectly valid session would sit stuck on the login form forever,
  // which reads as "the login doesn't persist" even though it does.
  useEffect(() => {
    if (!initializing && isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [initializing, isAuthenticated, navigate, redirectTo]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (username === 'onec_admin') {
        const data = await superAdminApi.login({ username, password });
        setSuperAdminToken(data.token);
        // We do a hard redirect to ensure the SuperAdminAuthProvider remounts cleanly with the new token
        window.location.href = '/super-admin';
        return;
      }

      try {
        await login(username, password);
      } catch (err) {
        if (typeof err?.status !== 'number') {
          await login(username, password);
        } else {
          throw err;
        }
      }
      await reloadConfig();
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const message = typeof err?.status === 'number' ? err.message : 'Could not reach the server. Check your connection and try again.';
      setError(message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex w-full flex-col items-center justify-center font-body">
      <div className="w-full">
        <form
          onSubmit={handleSubmit}
          className="w-full bg-white px-8 py-10 sm:px-10"
        >
          <div className="mb-2 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-microsoft-blue/10 text-microsoft-blue">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-2.625 6c-.54 0-.828.419-.936.634a1.96 1.96 0 00-.189.866c0 .298.059.605.189.866.108.215.395.634.936.634.54 0 .828-.419.936-.634.13-.26.189-.568.189-.866 0-.298-.059-.605-.189-.866-.108-.215-.395-.634-.936-.634zm4.314.634c.108-.215.395-.634.936-.634.54 0 .828.419.936.634.13.26.189.568.189.866 0 .298-.059.605-.189.866-.108.215-.395.634-.936.634-.54 0-.828-.419-.936-.634a1.96 1.96 0 01-.189-.866c0-.298.059-.605.189-.866zm-4.328 4.46a.75.75 0 00-1.488.192 4.986 4.986 0 005.112 4.103 4.986 4.986 0 005.112-4.103.75.75 0 10-1.488-.192 3.486 3.486 0 01-3.624 2.795 3.486 3.486 0 01-3.624-2.795z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="mb-1 text-center text-2xl font-extrabold tracking-tight text-ink-900">
            Welcome Back
          </div>
          <div className="mb-8 text-center text-sm font-medium text-ink-500">
            Sign in to your OneCampus account
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-700">Username</label>
              <input
                className="w-full rounded-lg border border-border bg-surface-muted px-4 py-3 text-[14px] text-ink-900 placeholder-ink-400 outline-none transition-colors focus:border-microsoft-blue focus:bg-white focus:ring-1 focus:ring-microsoft-blue"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-700">Password</label>
              <input
                type="password"
                className="w-full rounded-lg border border-border bg-surface-muted px-4 py-3 text-[14px] text-ink-900 placeholder-ink-400 outline-none transition-colors focus:border-microsoft-blue focus:bg-white focus:ring-1 focus:ring-microsoft-blue"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-md bg-danger/10 p-3 text-center text-[13px] font-semibold text-danger">
              {error}
            </div>
          )}

          <div className="mt-8">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-microsoft-blue py-3.5 text-[14.5px] font-bold text-white shadow-md transition-all hover:bg-microsoft-hover hover:shadow-lg disabled:pointer-events-none disabled:opacity-70"
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </div>

          <div className="mt-6 flex justify-center">
            <InstallAppPrompt />
          </div>
        </form>
      </div>
    </div>
  );
}
