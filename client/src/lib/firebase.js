import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

// Consistent [FCM] prefix across every file touching the notification
// lifecycle (this module, usePushNotificationSync.jsx, ProfilePage.jsx,
// firebase-messaging-sw.js) so DevTools console filtering ("[FCM]") shows
// the whole flow in one place while manually testing via Firebase Console
// → Send test message. See AGENT_LOG.md Entry 031 for the expected log
// sequence per test stage.
export function fcmLog(...args) { console.log('[FCM]', ...args); }
export function fcmWarn(...args) { console.warn('[FCM]', ...args); }
export function fcmError(...args) { console.error('[FCM]', ...args); }

// Your web app's Firebase configuration. apiKey/appId/messagingSenderId
// etc. are public project identifiers, not secrets — safe to hardcode
// (see notification_plan.md's note on this).
const firebaseConfig = {
  apiKey: "AIzaSyBUbiV-_jCT3VHmrmSSq6lU7mBLqwwBVWA",
  authDomain: "onecampus-edu.firebaseapp.com",
  projectId: "onecampus-edu",
  storageBucket: "onecampus-edu.firebasestorage.app",
  messagingSenderId: "323095309987",
  appId: "1:323095309987:web:8a73dd3cc0c6be03a19916",
  measurementId: "G-2N8P9C2R9N"
};

fcmLog('Initializing Firebase app', { projectId: firebaseConfig.projectId });
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
fcmLog('Firebase app initialized');

// Firebase Messaging isn't supported everywhere (older Safari, some in-app
// browsers, non-secure contexts) — isSupported() must be awaited before
// touching getMessaging(), which throws synchronously if unsupported.
// Memoized so repeated calls don't re-run the check.
let messagingPromise = null;
function getMessagingInstance() {
  if (!messagingPromise) {
    messagingPromise = isSupported()
      .then((supported) => {
        fcmLog('Firebase Messaging support check:', supported ? 'supported' : 'NOT supported in this browser/context');
        return supported ? getMessaging(app) : null;
      })
      .catch((error) => {
        fcmError('isSupported() check threw', error);
        return null;
      });
  }
  return messagingPromise;
}

// vite-plugin-pwa's workbox service worker is also served from '/' with no
// explicit scope, so it defaults to scope '/' — identical to what
// firebase-messaging-sw.js would get if registered implicitly via getToken()
// without a serviceWorkerRegistration. Two different SW scripts can't both
// hold the same scope: whichever registers second silently replaces the
// other's registration. Firebase's fix for coexisting with another SW is to
// register the messaging SW at its own distinct scope and pass that
// registration into getToken() explicitly.
const MESSAGING_SW_SCOPE = '/firebase-cloud-messaging-push-scope';
let swRegistrationPromise = null;
function getMessagingSwRegistration() {
  if (!('serviceWorker' in navigator)) {
    fcmWarn('navigator.serviceWorker unavailable — cannot register firebase-messaging-sw.js');
    return Promise.resolve(null);
  }
  if (!swRegistrationPromise) {
    fcmLog('Registering firebase-messaging-sw.js at scope', MESSAGING_SW_SCOPE);
    swRegistrationPromise = navigator.serviceWorker
      .register('/firebase-messaging-sw.js', { scope: MESSAGING_SW_SCOPE })
      .then((registration) => {
        fcmLog('firebase-messaging-sw.js registered', { scope: registration.scope });
        return registration;
      })
      .catch((error) => {
        fcmError('firebase-messaging-sw.js registration failed', error);
        throw error;
      });
  }
  return swRegistrationPromise;
}

// Prompts for browser notification permission (if not already decided) and
// returns a fresh FCM registration token, or null if unsupported/denied.
export async function requestPushPermission(vapidKey) {
  fcmLog('requestPushPermission() called');
  const messaging = await getMessagingInstance();
  if (!messaging) {
    fcmWarn('requestPushPermission() aborted — Messaging unsupported');
    return null;
  }
  try {
    fcmLog('Requesting notification permission from the browser...');
    const permission = await Notification.requestPermission();
    fcmLog('Notification permission result:', permission);
    if (permission !== 'granted') return null;

    const serviceWorkerRegistration = await getMessagingSwRegistration();
    fcmLog('Requesting FCM registration token...');
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration });
    if (token) {
      fcmLog('FCM token generated (paste into Firebase Console → Send test message):', token);
    } else {
      fcmWarn('getToken() returned no token');
    }
    return token;
  } catch (error) {
    fcmError('Error getting push notification permission or token', error);
    return null;
  }
}

// Silently returns the current token without prompting — used to re-sync
// onec_fcm_tokens on app load when permission was already granted in an
// earlier session (FCM tokens can rotate underneath the app).
export async function getExistingPushToken(vapidKey) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    fcmLog('getExistingPushToken() skipped — permission not previously granted');
    return null;
  }
  const messaging = await getMessagingInstance();
  if (!messaging) return null;
  try {
    fcmLog('Refreshing FCM token silently...');
    const serviceWorkerRegistration = await getMessagingSwRegistration();
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration });
    if (token) {
      fcmLog('FCM token refreshed:', token);
    } else {
      fcmWarn('Silent token refresh returned no token');
    }
    return token;
  } catch (error) {
    fcmError('Error refreshing push notification token', error);
    return null;
  }
}

// Foreground messages (app tab open, regardless of focus) don't produce a
// native notification on their own — only a closed-tab/background push
// routes through firebase-messaging-sw.js's showNotification call. Callers
// must render something themselves (see showLocalNotification below).
// Returns the unsubscribe function.
export async function listenForegroundMessages(callback) {
  const messaging = await getMessagingInstance();
  if (!messaging) {
    fcmWarn('listenForegroundMessages() aborted — Messaging unsupported');
    return () => {};
  }
  fcmLog('[FOREGROUND]', 'Foreground message listener attached');
  return onMessage(messaging, (payload) => {
    fcmLog('[FOREGROUND]', 'Notification received from Firebase Cloud Messaging', {
      title: payload.notification?.title,
      body: payload.notification?.body,
      data: payload.data
    });
    callback(payload);
  });
}

// Firebase only auto-displays a native notification for background/
// terminated-state pushes (via firebase-messaging-sw.js's
// onBackgroundMessage). For foreground pushes the app has to show one
// itself to get the same visible, OS-level confirmation of delivery —
// otherwise "did it actually arrive" is only verifiable via console logs
// or the in-app toast, not by a real notification the way every other
// app state produces one.
//
// Prefers the page-context Notification API; some browsers (notably
// Android Chrome) don't support constructing Notification directly from a
// document — falls back to the already-registered messaging service
// worker's registration.showNotification(), whose click is then handled
// by firebase-messaging-sw.js's shared notificationclick listener, same as
// a background notification's click.
export async function showLocalNotification(title, options = {}) {
  if (typeof Notification === 'function') {
    try {
      const notification = new Notification(title, options);
      notification.onclick = () => {
        fcmLog('[FOREGROUND]', 'Notification tap event — app opened from a foreground notification');
        window.focus();
        notification.close();
      };
      fcmLog('[FOREGROUND]', 'Local notification displayed (page Notification API)');
      return;
    } catch (error) {
      fcmWarn('[FOREGROUND]', 'Page-context Notification() failed, falling back to service worker', error);
    }
  }

  const registration = await getMessagingSwRegistration();
  if (!registration) {
    fcmWarn('[FOREGROUND]', 'No service worker registration available — cannot display local notification');
    return;
  }
  await registration.showNotification(title, options);
  fcmLog('[FOREGROUND]', 'Local notification displayed (service worker registration — tap handled by firebase-messaging-sw.js)');
}

export { app, analytics };
