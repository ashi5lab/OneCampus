import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

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

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Firebase Messaging isn't supported everywhere (older Safari, some in-app
// browsers, non-secure contexts) — isSupported() must be awaited before
// touching getMessaging(), which throws synchronously if unsupported.
// Memoized so repeated calls don't re-run the check.
let messagingPromise = null;
function getMessagingInstance() {
  if (!messagingPromise) {
    messagingPromise = isSupported()
      .then((supported) => (supported ? getMessaging(app) : null))
      .catch(() => null);
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
  if (!('serviceWorker' in navigator)) return Promise.resolve(null);
  if (!swRegistrationPromise) {
    swRegistrationPromise = navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: MESSAGING_SW_SCOPE
    });
  }
  return swRegistrationPromise;
}

// Prompts for browser notification permission (if not already decided) and
// returns a fresh FCM registration token, or null if unsupported/denied.
export async function requestPushPermission(vapidKey) {
  const messaging = await getMessagingInstance();
  if (!messaging) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
    const serviceWorkerRegistration = await getMessagingSwRegistration();
    return await getToken(messaging, { vapidKey, serviceWorkerRegistration });
  } catch (error) {
    console.error('Error getting push notification permission or token:', error);
    return null;
  }
}

// Silently returns the current token without prompting — used to re-sync
// onec_fcm_tokens on app load when permission was already granted in an
// earlier session (FCM tokens can rotate underneath the app).
export async function getExistingPushToken(vapidKey) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return null;
  const messaging = await getMessagingInstance();
  if (!messaging) return null;
  try {
    const serviceWorkerRegistration = await getMessagingSwRegistration();
    return await getToken(messaging, { vapidKey, serviceWorkerRegistration });
  } catch (error) {
    console.error('Error refreshing push notification token:', error);
    return null;
  }
}

// Foreground messages (app tab open, regardless of focus) don't produce a
// native notification on their own — only a closed-tab/background push
// routes through firebase-messaging-sw.js's showNotification call. Callers
// must render something themselves. Returns the unsubscribe function.
export async function listenForegroundMessages(callback) {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
}

export { app, analytics };
