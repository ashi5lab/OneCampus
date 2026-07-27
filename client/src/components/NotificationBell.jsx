import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { useSocket } from '../contexts/SocketContext';
import { useUnreadCount } from '../features/messages/hooks/useMessages';
import { useActivities } from '../features/activities/hooks/useActivities';

// Combined unread-messages + recent-activity badge — "activity" here
// includes push/broadcast notifications (see modules/activity/controller.js,
// which folds onec_notifications into the same feed as notices/mentions/
// assignments/etc.), so a push notification counts toward this badge and
// clicking through lands on the same Activities feed that already shows it.
export function NotificationBell({ className = '' }) {
  const navigate = useNavigate();
  const { can } = useAuth();
  const { hasModule } = useConfig();
  const socket = useSocket();
  const queryClient = useQueryClient();
  const messagingEnabled = hasModule('messaging') && can('messages.view');
  const { data: unreadCount } = useUnreadCount({ enabled: messagingEnabled });
  const { data: activity } = useActivities();
  const notifCount = (unreadCount || 0) + (activity?.recentCount || 0);

  // Refresh the badge the instant a push notification is created server-side
  // (Socket.io 'notification:new'), rather than waiting for the next 10s poll.
  useEffect(() => {
    if (!socket) return;
    const handler = () => queryClient.invalidateQueries({ queryKey: ['activities'] });
    socket.on('notification:new', handler);
    return () => socket.off('notification:new', handler);
  }, [socket, queryClient]);

  return (
    <button
      type="button"
      onClick={() => navigate('/app/activities')}
      aria-label="Notifications"
      className={`relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-ink-700 transition hover:bg-surface-muted ${className}`}
    >
      <Bell className="h-5 w-5" strokeWidth={1.8} />
      {notifCount > 0 && (
        <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-danger ring-2 ring-surface" />
        </span>
      )}
    </button>
  );
}
