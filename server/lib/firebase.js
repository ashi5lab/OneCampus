const admin = require('firebase-admin');

// Initialize Firebase Admin SDK once at startup
// The FIREBASE_PRIVATE_KEY comes from .env with literal \n escape sequences
// that need to be converted to actual newlines for the PEM format
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
    console.warn('[FCM] Firebase environment variables incomplete — push notifications disabled');
    // Continue without throwing — app runs, but push won't work
    module.exports = null;
  } else {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    });
    console.log('[FCM] Firebase Admin SDK initialized');
    module.exports = admin;
  }
} else {
  module.exports = admin;
}
