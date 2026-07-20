import { NavLink } from 'react-router-dom';
import { useConfig } from '../contexts/ConfigContext';
import { useAuth } from '../contexts/AuthContext';
import { useMyProfile } from '../features/profile/hooks/useProfile';
import { useUnreadCount } from '../features/messages/hooks/useMessages';
import { useActivities } from '../features/activities/hooks/useActivities';
import { Avatar } from './Avatar';

// Same split as BottomTabBar.jsx's REDESIGNED_ROLES — learner/instructor/
// staff get Class/Activities in place of Students/Classes here too.
const REDESIGNED_ROLES = ['learner', 'instructor', 'staff'];

const navItemClass = ({ isActive }) =>
  `mb-0.5 flex items-center gap-2.5 rounded px-3 py-2 text-[13.5px] font-medium ${
    isActive
      ? 'bg-sidebar-activeBg font-semibold text-sidebar-activeText'
      : 'text-sidebar-text hover:bg-sidebar-hover'
  }`;

// Desktop-only (see BottomTabBar.jsx for the mobile equivalent) — fixed to
// Dashboard/Students/Classes/More/Settings per the redesign mock, not
// tenant-configurable the way it used to be. What IS still tenant-
// configurable is which cards show on the Dashboard's "Your Modules" grid
// (see ManageDashboardAppsPage) — the sidebar itself no longer grows with
// that list, it stays this same fixed shape for everyone.
export function Sidebar() {
  const { config, t, hasModule } = useConfig();
  const { user, logout, can, profile } = useAuth();
  const messagingEnabled = hasModule('messaging') && can('messages.view');
  const { data: unreadCount } = useUnreadCount({ enabled: messagingEnabled });
  const useNewShell = REDESIGNED_ROLES.includes(user?.role);
  const { data: activity } = useActivities({ enabled: useNewShell });

  // "My Profile" — only meaningful for roles that have a row in
  // onec_learners/onec_instructors to link to (see AuthContext's `profile`,
  // populated from GET /auth/me). Admin/staff/guardian have nowhere to
  // link to yet.
  const ownProfileLink = profile?.learnerId
    ? { to: `/app/learners/${profile.learnerId}`, label: 'My Profile' }
    : profile?.instructorId
      ? { to: `/app/instructors/${profile.instructorId}`, label: 'My Profile' }
      : null;

  const { data: myProfile } = useMyProfile();

  return (
    <div
      className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar-bg px-4 text-sidebar-textStrong md:relative md:flex md:h-screen"
      style={{ paddingTop: '1.5rem', paddingBottom: '1.5rem' }}
    >
      <div className="mb-7 px-2">
        <div className="text-[15px] font-bold tracking-tight text-sidebar-textStrong">
          {config?.org_name || 'OneCampus'}
        </div>
        <div className="mt-0.5 text-[11px] text-sidebar-text">
          {config?.org_type ? `${config.org_type[0].toUpperCase()}${config.org_type.slice(1)} Management` : 'School Management'}
        </div>
      </div>

      <div className="px-3 pb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-sidebar-text">
        Overview
      </div>
      <NavLink to="/app" end className={navItemClass}>
        Dashboard
      </NavLink>
      {ownProfileLink && (
        <NavLink to={ownProfileLink.to} className={navItemClass}>
          {ownProfileLink.label}
        </NavLink>
      )}

      <div className="px-3 pb-1.5 pt-4 text-[10.5px] font-bold uppercase tracking-wide text-sidebar-text">
        Management
      </div>
      {useNewShell ? (
        <>
          <NavLink to="/app/class" className={navItemClass}>
            Class
          </NavLink>
          <NavLink to="/app/activities" className={navItemClass}>
            <span className="flex flex-1 items-center justify-between">
              Activities
              {activity?.recentCount > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-ink">
                  {activity.recentCount > 99 ? '99+' : activity.recentCount}
                </span>
              )}
            </span>
          </NavLink>
        </>
      ) : (
        <>
          {can('learners.view') && (
            <NavLink to="/app/learners" className={navItemClass}>
              {t('learners')}
            </NavLink>
          )}
          {can('cohorts.view') && (
            <NavLink to="/app/cohorts" className={navItemClass}>
              {t('cohorts')}
            </NavLink>
          )}
        </>
      )}

      <div className="px-3 pb-1.5 pt-4 text-[10.5px] font-bold uppercase tracking-wide text-sidebar-text">
        More
      </div>
      <NavLink to="/app/more" className={navItemClass}>
        <span className="flex flex-1 items-center justify-between">
          More
          {unreadCount > 0 && (
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-ink">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </span>
      </NavLink>
      <NavLink to="/app/profile" className={navItemClass}>
        Settings
      </NavLink>

      <div className="mt-auto space-y-3 pt-3">
        <div className="flex items-center gap-2.5 border-t border-sidebar-border px-1 pt-3">
          {/* Clicking the avatar/name opens the account screen (picture +
              change password) — see features/profile/components/ProfilePage. */}
          <NavLink
            to="/app/profile"
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded p-1 hover:bg-sidebar-hover"
          >
            <Avatar name={user?.username} src={myProfile?.profile_picture_url} size={30} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-sidebar-textStrong">{user?.username}</span>
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
  );
}
