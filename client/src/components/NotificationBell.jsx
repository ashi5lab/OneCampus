import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { useUnreadCount } from '../features/messages/hooks/useMessages';
import { useActivities } from '../features/activities/hooks/useActivities';

// Combined unread-messages + recent-activity badge, since there's no
// dedicated notifications feed yet — shared by Topbar (desktop) and
// HomeInsightsPage's mobile header (Topbar itself is desktop-only).
export function NotificationBell({ className = '' }) {
  const navigate = useNavigate();
  const { can } = useAuth();
  const { hasModule } = useConfig();
  const messagingEnabled = hasModule('messaging') && can('messages.view');
  const { data: unreadCount } = useUnreadCount({ enabled: messagingEnabled });
  const { data: activity } = useActivities();
  const notifCount = (unreadCount || 0) + (activity?.recentCount || 0);

  return (
    <button
      type="button"
      onClick={() => navigate('/app/activities')}
      aria-label="Notifications"
      className={`relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-ink-700 transition hover:bg-surface-muted ${className}`}
    >
      <Bell className="h-5 w-5" strokeWidth={1.8} />
      {notifCount > 0 && (
        <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-danger ring-2 ring-surface" />
      )}
    </button>
  );
}
