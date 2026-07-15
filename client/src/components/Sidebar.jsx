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
      ? 'bg-sidebar-activeBg font-semibold text-sidebar-activeText'
      : 'text-sidebar-text hover:bg-sidebar-hover'
  }`;

export function Sidebar({ isOpen, onClose }) {
  const { config, t, hasModule } = useConfig();
  const { user, logout, can } = useAuth();

  const managementLinks = [
    can('learners.view') && { to: '/learners', label: t('learners') },
    can('instructors.view') && { to: '/instructors', label: t('instructors') },
    can('cohorts.view') && { to: '/cohorts', label: t('cohorts') },
    can('units.view') && { to: '/units', label: 'Units' },
    can('modules.view') && { to: '/modules', label: t('topics') },
    can('guardians.view') && { to: '/guardians', label: 'Guardians' },
    hasModule('attendance') && can('attendance.view') && { to: '/attendance', label: 'Attendance' },
    hasModule('exams') && can('evaluations.view') && { to: '/evaluations', label: 'Exams' },
    hasModule('certificates') && can('certificates.view') && { to: '/certificates', label: 'Certificates' },
    hasModule('kindergarten_activity') && can('kindergarten_activity.view') && { to: '/kindergarten-activity', label: 'Daily Activity' }
  ].filter(Boolean);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden" 
          onClick={onClose}
        />
      )}
      
      {/* Sidebar Content */}
      <div className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-sidebar-border bg-sidebar-bg px-4 py-6 text-sidebar-textStrong transition-transform duration-300 md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
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
      <NavLink to="/" end className={navItemClass} onClick={onClose}>
        Dashboard
      </NavLink>

      {managementLinks.length > 0 && (
        <>
          <div className="px-3 pb-1.5 pt-4 text-[10.5px] font-bold uppercase tracking-wide text-sidebar-text">
            Management
          </div>
          {managementLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={navItemClass} onClick={onClose}>
              {link.label}
            </NavLink>
          ))}
        </>
      )}

      <div className="mt-auto space-y-3 pt-3">
        <ThemeSwitcher />
        <div className="flex items-center gap-2.5 border-t border-sidebar-border px-1 pt-3">
          <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-ink-700 text-xs font-semibold">
            {initials(user?.username)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold">{user?.username}</div>
            <div className="text-[11px] capitalize text-sidebar-text">{user?.role}</div>
          </div>
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
