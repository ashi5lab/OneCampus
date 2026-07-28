import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { fcmLog, fcmWarn, fcmError } from './firebase';

let cachedToken = null;
// Track listeners so we can remove them before adding new ones (prevents
// duplicate handlers piling up across hot-reloads and repeated register() calls).
let registrationListener = null;
let registrationErrorListener = null;
let foregroundListener = null;

// Helper: cleanly replace the registration listeners and call register().
// Returns a Promise that resolves with the token or rejects on error.
function registerAndGetToken() {
  return new Promise((resolve, reject) => {
    // Remove any stale listeners before adding new ones.
    if (registrationListener) { registrationListener.remove(); registrationListener = null; }
    if (registrationErrorListener) { registrationErrorListener.remove(); registrationErrorListener = null; }

    PushNotifications.addListener('registration', (token) => {
      fcmLog('[NATIVE]', 'Push registration success, token:', token.value.substring(0, 20) + '...');
      cachedToken = token.value;
      resolve(token.value);
    }).then((l) => { registrationListener = l; });

    PushNotifications.addListener('registrationError', (error) => {
      fcmError('[NATIVE]', 'Push registration error:', error);
      reject(error);
    }).then((l) => { registrationErrorListener = l; });

    PushNotifications.register();
  });
}

// Native: request push permission and get token.
// Called on app launch to ask for permission and register for push if needed.
export async function nativeRequestPushPermission() {
  if (!Capacitor.isNativePlatform()) return null;

  fcmLog('[NATIVE]', 'Requesting push permission...');
  try {
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      fcmWarn('[NATIVE]', 'Push permission denied');
      return null;
    }

    return await registerAndGetToken();
  } catch (error) {
    fcmError('[NATIVE]', 'Error requesting native push permission:', error);
    return null;
  }
}

// Native: get existing token without prompting.
// Used on subsequent app launches when permission was already granted.
export async function nativeGetExistingPushToken() {
  if (!Capacitor.isNativePlatform()) return null;

  try {
    const permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'granted') {
      if (cachedToken) {
        fcmLog('[NATIVE]', 'Returning cached token');
        return cachedToken;
      }
      // Re-register to get the token — this is safe to call multiple times.
      return await registerAndGetToken();
    }
  } catch (error) {
    fcmError('[NATIVE]', 'Error getting existing native push token:', error);
  }
  return null;
}

// Native: listen to foreground messages
export async function nativeListenForegroundMessages(callback) {
  if (!Capacitor.isNativePlatform()) return () => {};

  if (foregroundListener) {
    foregroundListener.remove();
    foregroundListener = null;
  }

  fcmLog('[NATIVE]', 'Foreground message listener attached');

  try {
    const listener = await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      fcmLog('[NATIVE]', 'Foreground notification received:', notification.title);

      // Standardize the payload format to match the web SDK so the callback doesn't need to care
      const payload = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data
      };

      callback(payload);
    });

    foregroundListener = listener;

    // Return unsubscribe function
    return () => {
      if (foregroundListener) {
        foregroundListener.remove();
        foregroundListener = null;
      }
    };
  } catch (error) {
    fcmError('[NATIVE]', 'Error attaching foreground listener:', error);
    return () => {};
  }
}

// Native: Local notification — handled automatically by Capacitor
// via presentationOptions in capacitor.config.json.
export async function nativeShowLocalNotification(title, options = {}) {
  fcmLog('[NATIVE]', 'nativeShowLocalNotification skipped - handled automatically by native presentationOptions');
}
