import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { useUnreadCount } from '../features/messages/hooks/useMessages';
import { useActivities } from '../features/activities/hooks/useActivities';

const ICONS = {
  home: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10" />
  ),
  students: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4l9 4-9 4-9-4 9-4zm-6 6v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" />
  ),
  classes: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16v12H4z M4 9h16 M9 5v12" />
  ),
  activities: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4l2-7 4 14 2-7h6" />
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

// Learner/instructor/staff get the redesigned Home/Class/Activities/More/
// Settings shell (see features/home, features/classChannel,
// features/activities) — admin and guardian keep the original Home/
// Students/Classes/More/Settings bar untouched, since neither role was
// part of that redesign (see Sidebar.jsx for the desktop equivalent of
// this same split).
const REDESIGNED_ROLES = ['learner', 'instructor', 'staff'];

// Mobile-only primary nav (see Sidebar.jsx for the desktop equivalent) —
// fixed at the bottom of the viewport rather than a hamburger + slide-in
// drawer, matching the redesign mock's native-app-style tab bar.
export function BottomTabBar() {
  const { can, user } = useAuth();
  const { hasModule } = useConfig();
  const messagingEnabled = hasModule('messaging') && can('messages.view');
  const { data: unreadCount } = useUnreadCount({ enabled: messagingEnabled });
  const useNewShell = REDESIGNED_ROLES.includes(user?.role);
  const { data: activity } = useActivities({ enabled: useNewShell });

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-sidebar-border bg-sidebar-bg md:hidden"
      style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))' }}
    >
      <NavLink to="/app" end className={tabClass}>
        <TabIcon name="home" />
        Home
      </NavLink>

      {useNewShell ? (
        <>
          <NavLink to="/app/class" className={tabClass}>
            <TabIcon name="classes" />
            Class
          </NavLink>
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
        </>
      ) : (
        <>
          {can('learners.view') && (
            <NavLink to="/app/learners" className={tabClass}>
              <TabIcon name="students" />
              Students
            </NavLink>
          )}
          {can('cohorts.view') && (
            <NavLink to="/app/cohorts" className={tabClass}>
              <TabIcon name="classes" />
              Classes
            </NavLink>
          )}
        </>
      )}

      <NavLink to="/app/more" className={tabClass}>
        <span className="relative">
          <TabIcon name="more" />
          {unreadCount > 0 && (
            <span className="absolute -right-1.5 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-accent px-0.5 text-[8.5px] font-bold text-accent-ink">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </span>
        More
      </NavLink>
      <NavLink to="/app/profile" className={tabClass}>
        <TabIcon name="settings" />
        Settings
      </NavLink>
    </nav>
  );
}
