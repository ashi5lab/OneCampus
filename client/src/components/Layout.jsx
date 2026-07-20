import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomTabBar } from './BottomTabBar';

// No mobile header bar anymore — each page's own "Management / X" heading
// in the content area is the only title now, instead of duplicating it in
// a boxed bar above. Primary navigation on mobile lives in BottomTabBar,
// not a hamburger + drawer. "Root" screens (the bottom tabs' own
// destinations) show no back arrow since there's nowhere shallower to pop
// to within the app shell.
const ROOT_PATHS = ['/app', '/app/learners', '/app/cohorts', '/app/more', '/app/profile'];

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isRoot = ROOT_PATHS.includes(location.pathname);

  return (
    <div className="flex min-h-screen flex-col bg-bg font-body text-ink-900 md:grid md:h-screen md:grid-cols-[248px_1fr] md:overflow-hidden">
      {/* Clears the status bar/notch on mobile now that there's no header
          bar to absorb env(safe-area-inset-top) itself. */}
      <div className="h-[env(safe-area-inset-top)] shrink-0 md:hidden" />

      <Sidebar />

      {/* Its own scroll container — the sidebar is pinned/scrolls independently
          (see Sidebar.jsx's overflow-y-auto), so a long page here shouldn't
          drag the nav out of view with it. Bottom padding grows past
          env(safe-area-inset-bottom) and the bottom tab bar's height, so
          content never sits behind either. */}
      <div
        className="mx-auto w-full max-w-[1180px] px-4 py-4 sm:px-6 md:overflow-y-auto md:px-9 md:py-7"
        style={{ paddingBottom: 'max(4.5rem, calc(3.75rem + env(safe-area-inset-bottom)))' }}
      >
        {!isRoot && (
          <button
            onClick={() => navigate(-1)}
            className="-ml-1.5 mb-3 flex items-center gap-1 rounded p-1.5 text-sm font-semibold text-ink-500 hover:bg-surface-muted hover:text-ink-900 md:hidden"
            aria-label="Back"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        )}
        <Outlet />
      </div>

      <BottomTabBar />
    </div>
  );
}
