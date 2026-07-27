import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Bell } from 'lucide-react';
import {
  getExistingPushToken,
  listenForegroundMessages,
  showLocalNotification,
  playNotificationChime,
  fcmLog,
  fcmError
} from '../lib/firebase';
import { useSaveFcmToken } from '../features/profile/hooks/useProfile';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Mounted once in Layout.jsx (the authenticated app shell), mirroring the
// socket listener effect already there. Two responsibilities:
//  1. Silently re-sync the FCM token if permission was already granted in
//     an earlier session — tokens can rotate, and onec_fcm_tokens would
//     otherwise go stale until the user happens to revisit Profile and
//     click "Enable Push Notifications" again. Saving is a no-op upsert
//     (see server/modules/profile/controller.js#saveFcmToken) so calling
//     it every app load is safe.
//  2. Show a toast for foreground pushes — the browser only auto-displays
//     a native notification for background/closed-tab pushes (handled by
//     firebase-messaging-sw.js); a foreground message needs the app to
//     render something itself.
export function usePushNotificationSync() {
  const navigate = useNavigate();
  const saveFcmToken = useSaveFcmToken();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    fcmLog('[TOKEN]', 'App load: permission already granted, silently syncing token...');
    getExistingPushToken(VAPID_KEY).then((token) => {
      if (!token) return;
      saveFcmToken.mutate(
        { token, device_info: navigator.userAgent },
        {
          onSuccess: () => fcmLog('[TOKEN]', 'Token synced to server (POST /profile/fcm-token)'),
          onError: (error) => fcmError('[TOKEN]', 'Failed to sync token to server', error)
        }
      );
    });
    // Intentionally runs once per mount — not re-run on saveFcmToken
    // identity changes (a new mutation object every render would otherwise
    // re-trigger this).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let unsubscribe = () => {};
    let cancelled = false;

    listenForegroundMessages((payload) => {
      const title = payload.notification?.title || 'Notification';
      const body = payload.notification?.body;
      const url = payload.data?.url;

      fcmLog('[FOREGROUND]', 'Displaying in-app toast:', { title, body });
      playNotificationChime();

      // A larger, colored card (not the app's plain default toast) so an
      // incoming push is unmistakable at a glance — this is a rarer,
      // higher-signal event than a routine "saved" confirmation toast.
      toast.custom(
        (t) => (
          <div
            onClick={() => {
              if (url) {
                fcmLog('[FOREGROUND]', 'App opened from notification (toast tap), navigating to', url);
                toast.dismiss(t.id);
                navigate(url);
              }
            }}
            className={`flex items-start gap-3 rounded-2xl border border-white/20 bg-gradient-to-br from-violet-600 to-indigo-600 px-4 py-3.5 shadow-2xl ring-1 ring-black/5 ${
              url ? 'cursor-pointer' : ''
            }`}
            style={{ minWidth: 320, maxWidth: 400 }}
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
              <Bell className="h-5 w-5 text-white" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="text-[14px] font-bold leading-snug text-white">{title}</div>
              {body && <div className="mt-1 text-[12.5px] leading-snug text-white/90">{body}</div>}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toast.dismiss(t.id);
              }}
              className="flex-shrink-0 text-white/70 hover:text-white"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        ),
        { duration: 6000, position: 'top-right' }
      );

      // Bell badge (see NotificationBell.jsx) reads the same ['activities']
      // query on a 10s poll — invalidate now so it updates immediately
      // instead of waiting for the next poll tick.
      queryClient.invalidateQueries({ queryKey: ['activities'] });

      // Also show a real OS-level notification for the foreground case —
      // otherwise foreground is the only app state where "was it actually
      // delivered" can't be visually confirmed the same way background/
      // terminated notifications are (a toast is app-internal UI, not a
      // notification the OS/browser itself displays).
      showLocalNotification(title, {
        body,
        icon: '/icon-192x192.svg',
        data: { url }
      }).catch((error) => fcmError('[FOREGROUND]', 'Failed to display local notification', error));
    }).then((unsub) => {
      if (cancelled) unsub();
      else unsubscribe = unsub;
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [navigate]);
}
