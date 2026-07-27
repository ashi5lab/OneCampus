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
  fcmLog('Background notification received:', payload);

  try {
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
      body: payload.notification.body,
      icon: '/icon-192x192.svg',
      data: { url: payload.data?.url || payload.fcmOptions?.link || '/app' }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
    fcmLog('Notification displayed:', notificationTitle);
  } catch (error) {
    fcmError('Failed to display background notification', error);
  }
});

// Clicking a background notification does nothing by default — focus an
// already-open app tab if one exists, otherwise open a new one.
self.addEventListener('notificationclick', (event) => {
  fcmLog('Notification clicked — app being opened/focused from a background notification', {
    url: event.notification.data?.url
  });
  event.notification.close();
  const url = event.notification.data?.url || '/app';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          fcmLog('Focusing existing app window');
          client.navigate(url);
          return client.focus();
        }
      }
      fcmLog('No existing app window — opening a new one');
      return clients.openWindow(url);
    }).catch((error) => fcmError('Failed to focus/open app window on notification click', error))
  );
});
