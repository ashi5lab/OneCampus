// Give the service worker access to Firebase Messaging.
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

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

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192x192.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
