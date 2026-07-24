import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBUbiV-_jCT3VHmrmSSq6lU7mBLqwwBVWA",
  authDomain: "onecampus-edu.firebaseapp.com",
  projectId: "onecampus-edu",
  storageBucket: "onecampus-edu.firebasestorage.app",
  messagingSenderId: "323095309987",
  appId: "1:323095309987:web:8a73dd3cc0c6be03a19916",
  measurementId: "G-2N8P9C2R9N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const messaging = getMessaging(app);

// Request push notification permissions and return the token
export async function requestPushPermission(vapidKey) {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, { vapidKey });
      return token;
    }
  } catch (error) {
    console.error('Error getting push notification permission or token:', error);
  }
  return null;
}

export { app, analytics, messaging, onMessage };
