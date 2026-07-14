import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useConfig } from '../../../contexts/ConfigContext';

export function LoginPage() {
  const { login } = useAuth();
  const { config } = useConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = location.state?.from?.pathname || '/';

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg font-body">
      <form
        onSubmit={handleSubmit}
        className="w-[340px] rounded border border-border bg-surface p-8"
      >
        <div className="mb-1 text-lg font-bold text-ink-900">
          {config?.org_name || 'OneCampus'}
        </div>
        <div className="mb-6 text-sm text-ink-500">Sign in to continue</div>

        <label className="mb-1 block text-xs font-semibold text-ink-700">Username</label>
        <input
          className="mb-4 w-full rounded border border-border px-3 py-2 text-sm"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
        />

        <label className="mb-1 block text-xs font-semibold text-ink-700">Password</label>
        <input
          type="password"
          className="mb-5 w-full rounded border border-border px-3 py-2 text-sm"
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
      </form>
    </div>
  );
}
