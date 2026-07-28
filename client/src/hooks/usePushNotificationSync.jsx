import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Bell } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import {
  requestPushPermission,
  getExistingPushToken,
  listenForegroundMessages,
  showLocalNotification,
  playNotificationChime,
  fcmLog,
  fcmError
} from '../lib/firebase';
import { nativeListenNotificationTap } from '../lib/nativePush';
import { useSaveFcmToken } from '../features/profile/hooks/useProfile';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Keep track of recently displayed toasts to prevent duplicate toasts if BOTH
// Socket.io and FCM deliver the exact same notification in close succession.
const recentToastKeys = new Set();

function showNotificationToast({ title, body, url, source, navigate, queryClient }) {
  const dedupKey = `${title}:${body}:${url || ''}`;
  if (recentToastKeys.has(dedupKey)) {
    fcmLog(`[${source}]`, 'Notification skipped — already displayed recently:', { title, body });
    return;
  }
  recentToastKeys.add(dedupKey);
  setTimeout(() => recentToastKeys.delete(dedupKey), 5000);

  fcmLog(`[${source}]`, 'Displaying in-app toast:', { title, body });
  playNotificationChime();

  toast.custom(
    (t) => (
      <div
        onClick={() => {
          if (url) {
            fcmLog(`[${source}]`, 'App opened from notification (toast tap), navigating to', url);
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

  queryClient.invalidateQueries({ queryKey: ['activities'] });
  queryClient.invalidateQueries({ queryKey: ['notifications'] });

  showLocalNotification(title, {
    body,
    icon: '/icon-192x192.svg',
    data: { url }
  }).catch((error) => fcmError(`[${source}]`, 'Failed to display local notification', error));
}

// Mounted once in Layout.jsx (the authenticated app shell). Responsibilities:
//  1. Silently re-sync the FCM token if permission was already granted.
//  2. Real-time toast display via Socket.io notification:new and FCM foreground push.
export function usePushNotificationSync() {
  const navigate = useNavigate();
  const saveFcmToken = useSaveFcmToken();
  const queryClient = useQueryClient();
  const socket = useSocket();

  useEffect(() => {
    const syncToken = async () => {
      let token = null;

      if (Capacitor.isNativePlatform()) {
        try {
          let permStatus = await PushNotifications.checkPermissions();
          if (permStatus.receive === 'prompt') {
            fcmLog('[TOKEN]', 'Native push permission not granted yet. Requesting on launch...');
            permStatus = await PushNotifications.requestPermissions();
          }
          if (permStatus.receive !== 'granted') {
            fcmLog('[TOKEN]', 'Native push permission denied.');
            return;
          }
          token = await requestPushPermission(VAPID_KEY);
        } catch (e) {
          fcmError('[TOKEN]', 'Native push permission check failed', e);
          return;
        }
      } else {
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
        token = await getExistingPushToken(VAPID_KEY);
      }

      if (!token) return;
      fcmLog('[TOKEN]', 'App load: permission granted, syncing token...');
      saveFcmToken.mutate(
        { token, device_info: navigator.userAgent },
        {
          onSuccess: () => fcmLog('[TOKEN]', 'Token synced to server (POST /profile/fcm-token)'),
          onError: (error) => fcmError('[TOKEN]', 'Failed to sync token to server', error)
        }
      );
    };

    syncToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Socket.io real-time notifications listener
  useEffect(() => {
    if (!socket) return;
    const handleSocketNotification = (notification) => {
      const title = notification.title || 'Notification';
      const body = notification.body;
      const url = notification.url || notification.data?.url;
      showNotificationToast({ title, body, url, source: 'SOCKET', navigate, queryClient });
    };

    socket.on('notification:new', handleSocketNotification);
    return () => socket.off('notification:new', handleSocketNotification);
  }, [socket, navigate, queryClient]);

  // FCM foreground push listener
  useEffect(() => {
    let unsubscribe = () => {};
    let cancelled = false;

    listenForegroundMessages((payload) => {
      const title = payload.notification?.title || 'Notification';
      const body = payload.notification?.body;
      const url = payload.data?.url;
      showNotificationToast({ title, body, url, source: 'FOREGROUND', navigate, queryClient });
    }).then((unsub) => {
      if (cancelled) unsub();
      else unsubscribe = unsub;
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [navigate, queryClient]);

  // Native tap-to-open — no-op on web (browser tap is handled by
  // firebase-messaging-sw.js's own notificationclick listener instead).
  useEffect(() => {
    let unsubscribe = () => {};
    let cancelled = false;

    nativeListenNotificationTap((url) => navigate(url)).then((unsub) => {
      if (cancelled) unsub();
      else unsubscribe = unsub;
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [navigate]);
}
