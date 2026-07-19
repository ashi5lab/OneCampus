import { NavLink } from 'react-router-dom';
import { useConfig } from '../contexts/ConfigContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavLinks } from '../hooks/useNavLinks';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useUnreadCount } from '../features/messages/hooks/useMessages';
import { useMyProfile } from '../features/profile/hooks/useProfile';
import { ThemeSwitcher } from './ThemeSwitcher';
import { Avatar } from './Avatar';

const navItemClass = ({ isActive }) =>
  `mb-0.5 flex items-center gap-2.5 rounded px-3 py-2 text-[13.5px] font-medium ${
    isActive
      ? 'bg-sidebar-activeBg font-semibold text-sidebar-activeText'
      : 'text-sidebar-text hover:bg-sidebar-hover'
  }`;

export function Sidebar({ isOpen, onClose }) {
  // Always mounted (desktop needs it visible unconditionally), so unlike a
  // modal — which is only mounted while open — this needs the explicit
  // isOpen check: sliding the drawer off-screen with a transform doesn't
  // stop the page underneath from scrolling on its own. isOpen only ever
  // toggles true from the mobile hamburger button, so this is a no-op on
  // desktop (md:) where the drawer is permanently visible instead.
  useBodyScrollLock(isOpen);
  const { config, hasModule } = useConfig();
  const { user, logout, can, profile } = useAuth();

  // "My Profile" — only meaningful for roles that have a row in
  // onec_learners/onec_instructors to link to (see AuthContext's `profile`,
  // populated from GET /auth/me). Admin/staff/guardian have nowhere to
  // link to yet.
  const ownProfileLink = profile?.learnerId
    ? { to: `/app/learners/${profile.learnerId}`, label: 'My Profile' }
    : profile?.instructorId
      ? { to: `/app/instructors/${profile.instructorId}`, label: 'My Profile' }
      : null;

  // Shared with the Dashboard's "V2" card view (useNavLinks.js) so the two
  // can never drift out of sync — the unread-message badge is Sidebar-only
  // presentational state, layered on afterwards rather than living in the
  // shared hook.
  const managementLinks = useNavLinks().map((link) =>
    link.to === '/app/messages' ? { ...link, showUnreadBadge: true } : link
  );

  const messagingEnabled = hasModule('messaging') && can('messages.view');
  const { data: unreadCount } = useUnreadCount({ enabled: messagingEnabled });
  // For the clickable account block at the bottom — brings in the profile
  // picture, which auth/me's session payload doesn't carry.
  const { data: myProfile } = useMyProfile();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden" 
          onClick={onClose}
        />
      )}
      
      {/* Sidebar Content — its own scroll container (overflow-y-auto +
          md:h-screen) so a long page's scroll doesn't drag the nav along
          with it; see Layout.jsx's matching md:overflow-y-auto on the main
          content column. pt-[max(...)] keeps the 24px design padding on
          browsers/desktop while growing to clear the status bar/notch when
          running as an edge-to-edge standalone PWA on iOS. */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar-bg px-4 text-sidebar-textStrong transition-transform duration-300 md:relative md:h-screen md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{
          paddingTop: 'max(1.5rem, env(safe-area-inset-top))',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))'
        }}
      >
        <div className="mb-7 flex items-center justify-between px-2">
          <div>
            <div className="text-[15px] font-semibold tracking-tight">
              {config?.org_name || 'OneCampus'}
            </div>
            <div className="mt-0.5 text-[11px] text-sidebar-text">
              {config?.org_type ? `${config.org_type[0].toUpperCase()}${config.org_type.slice(1)} Management` : ''}
            </div>
          </div>
          <button onClick={onClose} className="text-sidebar-text hover:text-sidebar-textStrong md:hidden">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

      <div className="px-3 pb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-sidebar-text">
        Overview
      </div>
      <NavLink to="/app" end className={navItemClass} onClick={onClose}>
        Dashboard
      </NavLink>
      {ownProfileLink && (
        <NavLink to={ownProfileLink.to} className={navItemClass} onClick={onClose}>
          {ownProfileLink.label}
        </NavLink>
      )}

      {managementLinks.length > 0 && (
        <>
          <div className="px-3 pb-1.5 pt-4 text-[10.5px] font-bold uppercase tracking-wide text-sidebar-text">
            Management
          </div>
          {managementLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={navItemClass} onClick={onClose}>
              <span className="flex flex-1 items-center justify-between">
                {link.label}
                {link.showUnreadBadge && unreadCount > 0 && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-ink">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </span>
            </NavLink>
          ))}
        </>
      )}

      <div className="mt-auto space-y-3 pt-3">
        <ThemeSwitcher />
        <div className="flex items-center gap-2.5 border-t border-sidebar-border px-1 pt-3">
          {/* Clicking the avatar/name opens the account screen (picture +
              change password) — see features/profile/components/ProfilePage. */}
          <NavLink
            to="/app/profile"
            onClick={onClose}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded p-1 hover:bg-sidebar-hover"
          >
            <Avatar name={user?.username} src={myProfile?.profile_picture_url} size={30} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold">{user?.username}</span>
              <span className="block text-[11px] capitalize text-sidebar-text">{user?.role}</span>
            </span>
          </NavLink>
          <button
            onClick={logout}
            className="text-[11px] font-semibold text-sidebar-text hover:text-sidebar-textStrong"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
