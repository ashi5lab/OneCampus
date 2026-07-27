import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getExistingPushToken, listenForegroundMessages } from '../lib/firebase';
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

  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    getExistingPushToken(VAPID_KEY).then((token) => {
      if (token) saveFcmToken.mutate({ token, device_info: navigator.userAgent });
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

      toast((t) => (
        <div className={url ? 'cursor-pointer' : ''} onClick={() => { if (url) { toast.dismiss(t.id); navigate(url); } }}>
          <div className="text-[13px] font-bold text-ink-900">{title}</div>
          {body && <div className="mt-0.5 text-[12px] text-ink-500">{body}</div>}
        </div>
      ), { duration: 6000 });
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
