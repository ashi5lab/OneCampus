import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { fcmLog, fcmWarn, fcmError } from './firebase';

let cachedToken = null;
let foregroundListener = null;

// Native: request push permission and get token
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
    
    return new Promise((resolve, reject) => {
      PushNotifications.addListener('registration', (token) => {
        fcmLog('[NATIVE]', 'Push registration success, token:', token.value);
        cachedToken = token.value;
        resolve(token.value);
      });
      
      PushNotifications.addListener('registrationError', (error) => {
        fcmError('[NATIVE]', 'Push registration error:', error);
        reject(error);
      });
      
      PushNotifications.register();
    });
  } catch (error) {
    fcmError('[NATIVE]', 'Error requesting native push permission:', error);
    return null;
  }
}

// Native: get existing token without prompting
export async function nativeGetExistingPushToken() {
  if (!Capacitor.isNativePlatform()) return null;
  
  try {
    const permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'granted') {
      if (cachedToken) return cachedToken;
      
      // If we don't have the token in memory, we need to register again to get it
      return new Promise((resolve) => {
        PushNotifications.addListener('registration', (token) => {
          cachedToken = token.value;
          resolve(token.value);
        });
        PushNotifications.register();
      });
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
  }
  
  fcmLog('[NATIVE]', 'Foreground message listener attached');
  
  try {
    foregroundListener = await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      fcmLog('[NATIVE]', 'Foreground notification received:', notification);
      
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

// Native: Local notification
export async function nativeShowLocalNotification(title, options = {}) {
  // Capacitor PushNotifications automatically shows the notification if presentationOptions has 'alert'
  // But if we want to manually trigger one, we would use the LocalNotifications plugin.
  // Since we set presentationOptions: ['badge', 'sound', 'alert'] in capacitor.config.json,
  // native foreground pushes will display automatically. We don't need to manually trigger local notifications 
  // for foreground pushes like we do on the web.
  fcmLog('[NATIVE]', 'nativeShowLocalNotification skipped - handled automatically by native presentationOptions');
}
