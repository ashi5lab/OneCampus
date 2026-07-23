import { NavLink, useNavigate } from 'react-router-dom';
import { Home, LayoutGrid, Activity, Inbox, Calendar, Grip, Settings, ChevronDown } from 'lucide-react';
import { useConfig } from '../contexts/ConfigContext';
import { useAuth } from '../contexts/AuthContext';
import { useMyProfile } from '../features/profile/hooks/useProfile';
import { useUnreadCount } from '../features/messages/hooks/useMessages';
import { useActivities } from '../features/activities/hooks/useActivities';
import { Avatar } from './Avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';

const navItemClass = ({ isActive }) =>
  `mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors ${
    isActive
      ? 'bg-sidebar-activeBg font-semibold text-sidebar-activeText'
      : 'text-sidebar-text hover:bg-sidebar-hover'
  }`;

function NavBadge({ count }) {
  if (!count) return null;
  return (
    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-ink">
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function Sidebar() {
  const navigate = useNavigate();
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
      <div className="mb-7 flex items-center gap-2.5 px-2">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-dark text-sm font-bold text-accent-ink">
          {(config?.org_name || 'OC').slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-bold tracking-tight text-sidebar-textStrong">
            {config?.org_name || 'OneCampus'}
          </div>
          <div className="truncate text-[11px] text-sidebar-text">
            {config?.org_type ? `${config.org_type[0].toUpperCase()}${config.org_type.slice(1)} Management` : 'School Management'}
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-1">
        <NavLink to="/app" end className={navItemClass}>
          <Home className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={1.8} />
          Dashboard
        </NavLink>

        {user?.role !== 'guardian' && (user?.role === 'admin' || user?.role === 'instructor' || user?.role === 'learner' || can('class.view')) && (
          <NavLink to={user?.role === 'admin' ? '/app/class-channels' : '/app/class'} className={navItemClass}>
            <LayoutGrid className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={1.8} />
            Classes
          </NavLink>
        )}

        <NavLink to="/app/activities" className={navItemClass}>
          <Activity className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={1.8} />
          <span className="flex flex-1 items-center justify-between">
            Activities
            <NavBadge count={activity?.recentCount} />
          </span>
        </NavLink>

        {messagingEnabled && (
          <NavLink to="/app/messages" className={navItemClass}>
            <Inbox className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={1.8} />
            <span className="flex flex-1 items-center justify-between">
              Messages
              <NavBadge count={unreadCount} />
            </span>
          </NavLink>
        )}

        {can('calendar.view') && (
          <NavLink to="/app/calendar" className={navItemClass}>
            <Calendar className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={1.8} />
            Calendar
          </NavLink>
        )}

        <NavLink to="/app/more" className={navItemClass}>
          <Grip className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={1.8} />
          More Apps
        </NavLink>
      </div>

      <div className="mt-auto pt-3">
        <NavLink to="/app/profile" className={navItemClass}>
          <Settings className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={1.8} />
          Settings
        </NavLink>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="mt-3 flex w-full items-center gap-2.5 rounded-lg border-t border-sidebar-border px-1 pt-3 text-left hover:bg-sidebar-hover"
            >
              <Avatar name={user?.username} src={myProfile?.profile_picture_url} size={30} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-sidebar-textStrong">
                  {myProfile?.name || user?.username}
                </span>
                <span className="block text-[11px] capitalize text-sidebar-text">{user?.role}</span>
              </span>
              <ChevronDown className="h-4 w-4 flex-shrink-0 text-sidebar-text" strokeWidth={2} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top">
            <DropdownMenuItem onClick={() => navigate('/app/profile')}>Settings</DropdownMenuItem>
            <DropdownMenuItem onClick={logout} className="text-danger">Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
