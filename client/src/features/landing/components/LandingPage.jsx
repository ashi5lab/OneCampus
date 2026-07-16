import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { InstallAppPrompt } from '../../../components/InstallAppPrompt';

export function LandingPage() {
  const { isAuthenticated, initializing } = useAuth();
  const navigate = useNavigate();

  // Same reasoning as LoginPage: the installed PWA icon can reopen to
  // whichever route "Add to Home Screen" was tapped from, including this
  // one — don't leave an already-logged-in user stranded on the marketing
  // page when their session silently restored in the background.
  useEffect(() => {
    if (!initializing && isAuthenticated) {
      navigate('/app', { replace: true });
    }
  }, [initializing, isAuthenticated, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-10 font-body">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-lg font-bold text-accent-ink">
            OC
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">OneCampus</h1>
          <p className="mt-1.5 text-sm text-ink-500">
            One platform for kindergartens, schools, and colleges.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            to="/register"
            className="block rounded-xl border border-border bg-surface p-5 transition hover:border-accent active:scale-[0.99]"
          >
            <div className="text-[15px] font-semibold text-ink-900">Register New Tenant</div>
            <div className="mt-1 text-[13px] text-ink-500">
              Set up your institution. A super admin reviews and approves new accounts.
            </div>
          </Link>

          <Link
            to="/login"
            className="block rounded-xl border border-border bg-surface p-5 transition hover:border-accent active:scale-[0.99]"
          >
            <div className="text-[15px] font-semibold text-ink-900">Login as Tenant</div>
            <div className="mt-1 text-[13px] text-ink-500">
              Already registered and approved? Sign in to your institution.
            </div>
          </Link>

          <Link
            to="/super-admin/login"
            className="block rounded-xl border border-border bg-surface-muted p-5 transition hover:border-accent active:scale-[0.99]"
          >
            <div className="text-[15px] font-semibold text-ink-900">Login as Super Admin</div>
            <div className="mt-1 text-[13px] text-ink-500">Platform administrator access.</div>
          </Link>
        </div>

        <InstallAppPrompt className="mt-3" />
      </div>
    </div>
  );
}
