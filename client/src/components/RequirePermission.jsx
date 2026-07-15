import { useAuth } from '../contexts/AuthContext';

// Guards a route against direct URL navigation by a role that lacks the
// page's core .view permission — the sidebar already hides the nav link,
// but that doesn't stop someone from typing the URL directly, and without
// this the page would render with React Query showing stale/previous
// cached data until the API's 403 quietly resolves (see GuardiansPage).
export function RequirePermission({ permission, children }) {
  const { can } = useAuth();

  if (!can(permission)) {
    return (
      <div className="rounded border border-border bg-surface p-8 text-center text-sm text-ink-500">
        You don't have access to this page.
      </div>
    );
  }

  return children;
}
