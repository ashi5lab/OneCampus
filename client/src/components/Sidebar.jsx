import { NavLink } from 'react-router-dom';
import { useConfig } from '../contexts/ConfigContext';
import { useAuth } from '../contexts/AuthContext';
import { ThemeSwitcher } from './ThemeSwitcher';

function initials(name) {
  return (name || '')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const navItemClass = ({ isActive }) =>
  `mb-0.5 flex items-center gap-2.5 rounded px-3 py-2 text-[13.5px] font-medium ${
    isActive
      ? 'bg-accent font-semibold text-ink-900'
      : 'text-sidebar-text hover:bg-sidebar-hover'
  }`;

export function Sidebar() {
  const { config, t, hasModule } = useConfig();
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-col bg-sidebar-bg px-4 py-6 text-white">
      <div className="mb-7 px-2">
        <div className="text-[15px] font-semibold tracking-tight">
          {config?.org_name || 'OneCampus'}
        </div>
        <div className="mt-0.5 text-[11px] text-sidebar-text">
          {config?.org_type ? `${config.org_type[0].toUpperCase()}${config.org_type.slice(1)} Management` : ''}
        </div>
      </div>

      <div className="px-3 pb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-sidebar-text">
        Overview
      </div>
      <NavLink to="/" end className={navItemClass}>
        Dashboard
      </NavLink>

      <div className="px-3 pb-1.5 pt-4 text-[10.5px] font-bold uppercase tracking-wide text-sidebar-text">
        Management
      </div>
      <NavLink to="/learners" className={navItemClass}>
        {t('learners')}
      </NavLink>
      <NavLink to="/instructors" className={navItemClass}>
        {t('instructors')}
      </NavLink>
      <NavLink to="/cohorts" className={navItemClass}>
        {t('cohorts')}
      </NavLink>
      {hasModule('attendance') && (
        <NavLink to="/attendance" className={navItemClass}>
          Attendance
        </NavLink>
      )}
      {hasModule('exams') && (
        <NavLink to="/evaluations" className={navItemClass}>
          Exams
        </NavLink>
      )}

      <div className="mt-auto space-y-3 pt-3">
        <ThemeSwitcher />
        <div className="flex items-center gap-2.5 border-t border-white/10 px-1 pt-3">
          <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-ink-700 text-xs font-semibold">
            {initials(user?.username)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold">{user?.username}</div>
            <div className="text-[11px] capitalize text-sidebar-text">{user?.role}</div>
          </div>
          <button
            onClick={logout}
            className="text-[11px] font-semibold text-sidebar-text hover:text-white"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
