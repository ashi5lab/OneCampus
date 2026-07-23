import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAllFeatureLinks } from '../hooks/useNavLinks';
import { useUnreadCount } from '../features/messages/hooks/useMessages';
import { useActivities } from '../features/activities/hooks/useActivities';
import { useConfig } from '../contexts/ConfigContext';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from './ui/dropdown-menu';
import { useMyProfile } from '../features/profile/hooks/useProfile';

// Persistent app chrome shared by every page on desktop — quick search over
// this user's own accessible features, a combined notifications bell
// (unread messages + recent activity, since there's no dedicated
// notifications feed yet), and the account menu. Mobile keeps its own
// BottomTabBar instead; this only renders at md+ (see Layout.jsx).
export function Topbar() {
  const { user, logout, can } = useAuth();
  const { hasModule } = useConfig();
  const { data: myProfile } = useMyProfile();
  const links = useAllFeatureLinks();
  const messagingEnabled = hasModule('messaging') && can('messages.view');
  const { data: unreadCount } = useUnreadCount({ enabled: messagingEnabled });
  const { data: activity } = useActivities();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return links.filter((l) => l.label.toLowerCase().includes(q)).slice(0, 6);
  }, [links, query]);

  const notifCount = (unreadCount || 0) + (activity?.recentCount || 0);

  function goTo(to) {
    setQuery('');
    setOpen(false);
    navigate(to);
  }

  return (
    <div className="sticky top-0 z-30 hidden items-center gap-4 border-b border-border bg-surface/80 px-9 py-4 backdrop-blur md:flex">
      <div className="relative flex-1 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" strokeWidth={2} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results[0]) goTo(results[0].to);
            if (e.key === 'Escape') { setQuery(''); inputRef.current?.blur(); }
          }}
          placeholder="Search anything…"
          className="w-full rounded-lg border border-border-subtle bg-surface-muted py-2 pl-10 pr-14 text-sm text-ink-900 placeholder:text-ink-500 transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border-subtle bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-ink-500">
          ⌘K
        </kbd>

        {open && query.trim() && (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
            {results.length === 0 ? (
              <div className="px-3.5 py-3 text-xs text-ink-500">No matches for "{query}"</div>
            ) : (
              results.map((r) => (
                <button
                  key={r.to}
                  type="button"
                  onMouseDown={() => goTo(r.to)}
                  className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] font-semibold text-ink-900 hover:bg-surface-muted"
                >
                  {r.label}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => navigate('/app/activities')}
        aria-label="Notifications"
        className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-ink-700 transition hover:bg-surface-muted"
      >
        <Bell className="h-5 w-5" strokeWidth={1.8} />
        {notifCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-danger ring-2 ring-surface" />
        )}
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="flex-shrink-0 rounded-full transition active:scale-95" aria-label="Account menu">
            <Avatar className="h-10 w-10">
              <AvatarImage src={myProfile?.profile_picture_url} alt={user?.username} />
              <AvatarFallback>{(user?.username || '?').slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
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
  );
}
