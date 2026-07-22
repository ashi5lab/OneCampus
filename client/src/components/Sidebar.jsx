import { NavLink } from 'react-router-dom';
import { useConfig } from '../contexts/ConfigContext';
import { useAuth } from '../contexts/AuthContext';
import { useMyProfile } from '../features/profile/hooks/useProfile';
import { useUnreadCount } from '../features/messages/hooks/useMessages';
import { useActivities } from '../features/activities/hooks/useActivities';
import { Avatar } from './Avatar';

const ICONS = {
  home: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10" />
  ),
  classes: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16v12H4z M4 9h16 M9 5v12" />
  ),
  activities: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4l2-7 4 14 2-7h6" />
  ),
  messages: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  ),
  calendar: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  ),
  more: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
  ),
  settings: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6zM4.5 12a7.5 7.5 0 01.2-1.7l-2-1.5 2-3.4 2.3.9a7.6 7.6 0 011.5-.9l.3-2.4h4l.3 2.4a7.6 7.6 0 011.5.9l2.3-.9 2 3.4-2 1.5c.1.5.2 1.1.2 1.7s-.1 1.2-.2 1.7l2 1.5-2 3.4-2.3-.9a7.6 7.6 0 01-1.5.9l-.3 2.4h-4l-.3-2.4a7.6 7.6 0 01-1.5-.9l-2.3.9-2-3.4 2-1.5A7.5 7.5 0 014.5 12z" />
  )
};

function TabIcon({ name }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} className="flex-shrink-0">
      {ICONS[name]}
    </svg>
  );
}

const navItemClass = ({ isActive }) =>
  `mb-0.5 flex items-center gap-3 rounded px-3 py-2 text-[13.5px] font-medium transition-colors ${
    isActive
      ? 'bg-sidebar-activeBg font-semibold text-sidebar-activeText'
      : 'text-sidebar-text hover:bg-sidebar-hover'
  }`;

export function Sidebar() {
  const { config, hasModule } = useConfig();
  const { user, logout, can } = useAuth();
  const messagingEnabled = hasModule('messaging') && can('messages.view');
  const { data: unreadCount } = useUnreadCount({ enabled: messagingEnabled });
  const { data: activity } = useActivities();
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

      <div className="flex-1 space-y-1">
        <NavLink to="/app" end className={navItemClass}>
          <TabIcon name="home" />
          Dashboard
        </NavLink>

        {user?.role !== 'guardian' && (user?.role === 'admin' || user?.role === 'instructor' || user?.role === 'learner' || can('class.view')) && (
          <NavLink to={user?.role === 'admin' ? '/app/class-channels' : '/app/class'} className={navItemClass}>
            <TabIcon name="classes" />
            Class
          </NavLink>
        )}

        <NavLink to="/app/activities" className={navItemClass}>
          <TabIcon name="activities" />
          <span className="flex flex-1 items-center justify-between">
            Activities
            {activity?.recentCount > 0 && (
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-ink">
                {activity.recentCount > 99 ? '99+' : activity.recentCount}
              </span>
            )}
          </span>
        </NavLink>

        {messagingEnabled && (
          <NavLink to="/app/messages" className={navItemClass}>
            <TabIcon name="messages" />
            <span className="flex flex-1 items-center justify-between">
              Messages
              {unreadCount > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-ink">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </span>
          </NavLink>
        )}

        {can('calendar.view') && (
          <NavLink to="/app/calendar" className={navItemClass}>
            <TabIcon name="calendar" />
            Calendar
          </NavLink>
        )}

        <NavLink to="/app/more" className={navItemClass}>
          <TabIcon name="more" />
          More Apps
        </NavLink>
      </div>

      <div className="mt-auto pt-3">
        <NavLink to="/app/profile" className={navItemClass}>
          <TabIcon name="settings" />
          Settings
        </NavLink>

        <div className="mt-3 flex items-center gap-2.5 border-t border-sidebar-border px-1 pt-3">
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
