import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, School } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAllFeatureLinks } from '../hooks/useNavLinks';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { NotificationBell } from './NotificationBell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from './ui/dropdown-menu';
import { useMyProfile } from '../features/profile/hooks/useProfile';
import { useTopbarStore } from '../stores/useTopbarStore';
import { BackButton } from './PageHeader';

// Global App Header
export function Topbar() {
  const { user, logout } = useAuth();
  const { data: myProfile } = useMyProfile();
  const navigate = useNavigate();
  const config = useTopbarStore(s => s.config);

  const displayName = myProfile?.name || user?.name || user?.username || 'Mr. Arjun Sharma';

  return (
    <div className="relative z-30 pt-2 px-3 md:px-5 w-full max-w-[1600px] mx-auto shrink-0">
      {/* Light Purple Top Box */}
      <div className="relative bg-accent-light rounded-[20px] md:rounded-[24px] p-3 md:p-4 overflow-hidden border border-accent-light shadow-sm">
        
        {/* Abstract swoosh waves */}
        <div className="absolute bottom-0 right-0 pointer-events-none w-full h-full">
          <svg width="100%" height="100%" viewBox="0 0 800 200" preserveAspectRatio="none" className="absolute bottom-0 opacity-60">
            <path d="M800 200V0C700 80 550 40 400 120C250 200 100 150 0 200H800Z" fill="#e0d4fc" opacity="0.6" />
            <path d="M800 200V80C650 150 500 50 350 150C200 250 50 180 0 200H800Z" fill="#9b7ffc" opacity="0.9" />
          </svg>
        </div>

        <div className="flex items-center justify-between relative z-10 gap-3">
          {config?.title ? (
            <div className="flex items-center gap-3">
              {config?.showBack && (
                <div className="bg-surface/80 rounded-full flex items-center justify-center shadow-sm">
                  <BackButton onClick={config?.onBack} />
                </div>
              )}
              <div>
                <h1 className="text-lg md:text-xl font-extrabold text-ink-900">{config.title}</h1>
                {config.subtitle && <p className="text-ink-500 text-[11px] md:text-xs font-semibold mt-0.5">{config.subtitle}</p>}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="w-[40px] h-[40px] bg-surface rounded-full flex flex-shrink-0 items-center justify-center shadow-sm text-accent hidden sm:flex">
                  <School className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-ink-500 text-[11px] md:text-xs font-semibold uppercase tracking-wider mb-0.5">Good Morning,</p>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg md:text-xl font-extrabold text-ink-900 truncate max-w-[160px] sm:max-w-xs">{displayName}</h1>
                  <span className="bg-accent/15 text-accent-dark px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide hidden sm:inline-block">
                    {user?.role === 'admin' ? 'Admin' : user?.role || 'Learner'}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* Avatar / Bell */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="relative transition active:scale-95 border-2 border-surface shadow-sm rounded-full" aria-label="Account menu">
                  <Avatar className="h-[36px] w-[36px]">
                    <AvatarImage src={myProfile?.profile_picture_url} alt={user?.username} />
                    <AvatarFallback>{(user?.username || '?').slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success border-2 border-surface rounded-full"></div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>{myProfile?.name || user?.username}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/app/profile')}>Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="text-danger">Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
