// Give the service worker access to Firebase Messaging. Loaded from a
// same-origin vendored copy (see scripts/copy-firebase-compat.js, run via
// postinstall) rather than Google's CDN — a `script-src 'self'` Content-
// Security-Policy on the client's static host blocks importScripts() from
// gstatic.com entirely, which fails SW registration outright
// (messaging/failed-service-worker-registration) and breaks push before it
// can even start. The vendored files always match the installed `firebase`
// package version (client/package.json), so there's no separate CDN
// version string to keep in sync by hand.
importScripts('/vendor/firebase-app-compat.js');
importScripts('/vendor/firebase-messaging-compat.js');

// Same [FCM] prefix used client-side (see lib/firebase.js) — filter
// DevTools' "sw.js" console context by "[FCM]" to see this worker's half
// of the lifecycle alongside the page's.
function fcmLog(...args) { console.log('[FCM]', ...args); }
function fcmError(...args) { console.error('[FCM]', ...args); }

fcmLog('firebase-messaging-sw.js script evaluating');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
const firebaseConfig = {
  apiKey: "AIzaSyBUbiV-_jCT3VHmrmSSq6lU7mBLqwwBVWA",
  authDomain: "onecampus-edu.firebaseapp.com",
  projectId: "onecampus-edu",
  storageBucket: "onecampus-edu.firebasestorage.app",
  messagingSenderId: "323095309987",
  appId: "1:323095309987:web:8a73dd3cc0c6be03a19916",
  measurementId: "G-2N8P9C2R9N"
};

firebase.initializeApp(firebaseConfig);
fcmLog('Firebase app initialized inside service worker');

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

self.addEventListener('install', () => {
  fcmLog('Service worker installing');
});

self.addEventListener('activate', () => {
  fcmLog('Service worker activated, scope:', self.registration.scope);
});

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title;
  const body = payload.notification?.body;

  // Root-cause fix: this callback runs inside firebase-js-sdk's onPush(),
  // which the SW's own 'push' listener wraps in event.waitUntil(onPush(...))
  // (see helpers/register.ts) — and onPush does
  // `await messaging.onBackgroundMessageHandler(payload)`, i.e. it awaits
  // whatever THIS callback returns. Earlier this callback had no `return`,
  // so it implicitly resolved to undefined the instant its synchronous body
  // finished — before clients.matchAll().then() and showNotification()'s
  // own promises had actually settled. With a live browser process (tab
  // open, or Chrome merely backgrounded) that discrepancy is invisible: the
  // process stays alive anyway and the async work quietly finishes a moment
  // later. But when Android has swiped the app away, the push event is
  // often served by a short-lived, on-demand wake of the browser process —
  // once waitUntil's promise resolves, Android is free to kill that process
  // immediately, which can cut showNotification() off before it finishes
  // drawing the notification, so it silently never appears. Returning the
  // full chain keeps the SW alive until the notification is actually shown.
  return clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
    const state = windowClients.length > 0 ? 'background (app open, unfocused)' : 'terminated (no app window open)';
    fcmLog('[BACKGROUND]', `Notification received from Firebase Cloud Messaging — app state: ${state}`, { title, body, data: payload.data });

    const notificationOptions = {
      body,
      icon: '/icon-192x192.png',
      data: { url: payload.data?.url || payload.fcmOptions?.link || '/app' }
    };

    return self.registration.showNotification(title, notificationOptions).then(
      () => fcmLog('[BACKGROUND]', 'Notification displayed:', title)
    );
  }).catch((error) => {
    fcmError('[BACKGROUND]', 'Failed to display background notification', error);
  });
});

// Clicking a notification does nothing by default — focus an already-open
// app tab if one exists, otherwise open a new one. Fires for both
// background/terminated notifications (shown above) and the foreground
// fallback notification shown via registration.showNotification() in
// lib/firebase.js's showLocalNotification() — the click event doesn't
// distinguish which code path displayed the notification.
self.addEventListener('notificationclick', (event) => {
  fcmLog('[NOTIFICATION_CLICK]', 'Notification tapped — app being opened/focused', {
    url: event.notification.data?.url
  });
  event.notification.close();
  const url = event.notification.data?.url || '/app';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          fcmLog('[NOTIFICATION_CLICK]', 'App opened from notification — focusing existing window');
          client.navigate(url);
          return client.focus();
        }
      }
      fcmLog('[NOTIFICATION_CLICK]', 'App opened from notification — no existing window, opening a new one');
      return clients.openWindow(url);
    }).catch((error) => fcmError('[NOTIFICATION_CLICK]', 'Failed to focus/open app window on notification click', error))
  );
});
