import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSuperAdminAuth } from '../../../contexts/SuperAdminAuthContext';

export function SuperAdminLoginPage() {
  const { login } = useSuperAdminAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      navigate('/super-admin', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-10 font-body">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[360px] rounded-xl border border-border bg-surface p-6 sm:p-8"
      >
        <div className="mb-1 text-lg font-bold text-ink-900">Super Admin</div>
        <div className="mb-6 text-sm text-ink-500">Platform administrator sign in</div>

        <label className="mb-1 block text-xs font-semibold text-ink-700">Username</label>
        <input className="input mb-4" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />

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

        <div className="mt-5 text-center text-xs">
          <Link to="/" className="font-semibold text-ink-500 hover:text-ink-900">
            &larr; Back to home
          </Link>
        </div>
      </form>
    </div>
  );
}
