import { Outlet, useLocation, useNavigate, NavLink } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomTabBar } from './BottomTabBar';
import { Avatar } from './Avatar';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { useMyProfile } from '../features/profile/hooks/useProfile';
import { getPageTitle } from '../lib/pageTitles';

// Mobile header shows just a back arrow (when not on a root tab) — primary
// navigation on mobile lives in BottomTabBar now, not a hamburger + drawer.
// "Root" screens (the bottom tabs' own destinations) show no back arrow
// since there's nowhere shallower to pop to within the app shell.
const ROOT_PATHS = ['/app', '/app/learners', '/app/cohorts', '/app/more', '/app/profile'];

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useConfig();
  const { data: myProfile } = useMyProfile();
  const isRoot = ROOT_PATHS.includes(location.pathname);
  const pageTitle = getPageTitle(location.pathname, t);

  return (
    <div className="flex min-h-screen flex-col bg-bg font-body text-ink-900 md:grid md:h-screen md:grid-cols-[248px_1fr] md:overflow-hidden">
      {/* Mobile header — full-bleed in --sidebar-bg (white), matching the
          desktop sidebar's own background so the two feel like one
          continuous surface. Extended under the status bar via
          env(safe-area-inset-top) padding for the installed PWA.
          Avatar + bold page title on the left (Teams-chat-style), the
          avatar always linking to Settings/account — mirrors the desktop
          sidebar's own account chip. */}
      <div
        className="flex items-center gap-2.5 border-b border-sidebar-border bg-sidebar-bg px-4 pb-3 text-sidebar-textStrong md:hidden"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        {!isRoot && (
          <button
            onClick={() => navigate(-1)}
            className="-ml-1.5 rounded p-1.5 text-sidebar-text hover:bg-sidebar-hover"
            aria-label="Back"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <NavLink to="/app/profile" aria-label="Settings">
          <Avatar name={user?.username} src={myProfile?.profile_picture_url} size={32} />
        </NavLink>
        <div className="text-[19px] font-bold tracking-tight">{pageTitle}</div>
      </div>

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
        <Outlet />
      </div>

      <BottomTabBar />
    </div>
  );
}
