import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { useUnreadCount } from '../features/messages/hooks/useMessages';
import { useActivities } from '../features/activities/hooks/useActivities';

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
    <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      {ICONS[name]}
    </svg>
  );
}

const tabClass = ({ isActive }) =>
  `flex flex-1 flex-col items-center justify-center gap-0.5 pt-2 text-[10.5px] font-semibold ${
    isActive ? 'text-accent' : 'text-ink-500'
  }`;

export function BottomTabBar() {
  const { can, user } = useAuth();
  const { hasModule } = useConfig();
  const messagingEnabled = hasModule('messaging') && can('messages.view');
  const { data: unreadCount } = useUnreadCount({ enabled: messagingEnabled });
  const { data: activity } = useActivities();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-sidebar-border bg-sidebar-bg md:hidden"
      style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))' }}
    >
      <NavLink to="/app" end className={tabClass}>
        <TabIcon name="home" />
        Dashboard
      </NavLink>

      {user?.role !== 'guardian' && (user?.role === 'admin' || user?.role === 'instructor' || user?.role === 'learner' || can('class.view')) && (
        <NavLink to={user?.role === 'admin' ? '/app/class-channels' : '/app/class'} className={tabClass}>
          <TabIcon name="classes" />
          Class
        </NavLink>
      )}

      <NavLink to="/app/activities" className={tabClass}>
        <span className="relative">
          <TabIcon name="activities" />
          {activity?.recentCount > 0 && (
            <span className="absolute -right-1.5 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-accent px-0.5 text-[8.5px] font-bold text-accent-ink">
              {activity.recentCount > 9 ? '9+' : activity.recentCount}
            </span>
          )}
        </span>
        Activities
      </NavLink>

      {messagingEnabled && (
        <NavLink to="/app/messages" className={tabClass}>
          <span className="relative">
            <TabIcon name="messages" />
            {unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-accent px-0.5 text-[8.5px] font-bold text-accent-ink">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </span>
          Messages
        </NavLink>
      )}

      {can('calendar.view') && (
        <NavLink to="/app/calendar" className={tabClass}>
          <TabIcon name="calendar" />
          Calendar
        </NavLink>
      )}

      <NavLink to="/app/more" className={tabClass}>
        <TabIcon name="more" />
        More Apps
      </NavLink>
    </nav>
  );
}
