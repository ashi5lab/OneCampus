import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useConfig } from '../../../contexts/ConfigContext';
import { getTenantDomain, setTenantDomain } from '../../../lib/apiClient';
import { InstallAppPrompt } from '../../../components/InstallAppPrompt';

export function LoginPage() {
  const { login, isAuthenticated, initializing } = useAuth();
  const { config, reloadConfig } = useConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const [domain, setDomain] = useState(getTenantDomain());
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
      setTenantDomain(domain.trim());
      try {
        await login(username, password);
      } catch (err) {
        // A raw network failure (no `.status` — the request never got a
        // response at all, vs. a real 401/400 which does) is often
        // transient on mobile — one retry before surfacing an error avoids
        // bouncing a login attempt that would have worked a second later.
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-10 font-body">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[380px] rounded-xl border border-border bg-surface p-6 sm:p-8"
      >
        <div className="mb-1 text-lg font-bold text-ink-900">
          {config?.org_name || 'OneCampus'}
        </div>
        <div className="mb-6 text-sm text-ink-500">Sign in to your institution</div>

        <label className="mb-1 block text-xs font-semibold text-ink-700">Tenant Domain</label>
        <input
          className="input mb-4"
          placeholder="yourschool.onecampus.local"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
        />

        <label className="mb-1 block text-xs font-semibold text-ink-700">Username</label>
        <input
          className="input mb-4"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
        />

        <label className="mb-1 block text-xs font-semibold text-ink-700">Password</label>
        <input
          type="password"
          className="input mb-5"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <div className="mb-4 text-xs font-semibold text-danger">{error}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-ink-900 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <InstallAppPrompt className="mt-3" />

        <div className="mt-5 flex justify-between text-xs">
          <Link to="/" className="font-semibold text-ink-500 hover:text-ink-900">
            &larr; Back
          </Link>
          <Link to="/register" className="font-semibold text-ink-500 hover:text-ink-900">
            Register a new tenant
          </Link>
        </div>
      </form>
    </div>
  );
}
