const admin = require('./firebase');

// Send push notification to all FCM tokens for a user
// Automatically removes expired/invalid tokens from the database
async function sendPush(db, userId, { title, body, data = {} }) {
  if (!admin) {
    console.warn('[FCM] Firebase Admin not initialized — push skipped');
    return;
  }

  try {
    // Fetch all valid tokens for this user
    const tokensResult = await db.query(
      'SELECT id, token FROM onec_fcm_tokens WHERE user_id = $1',
      [userId]
    );

    if (tokensResult.rows.length === 0) {
      console.log(`[FCM] No tokens found for user ${userId}`);
      return;
    }

    const tokens = tokensResult.rows.map(r => r.token);
    console.log(`[FCM] Sending to ${tokens.length} token(s) for user ${userId}`);

    // Send multicast message to all tokens
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      // Convert all data values to strings (FCM requirement)
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      webpush: {
        // Without an explicit Urgency, Android defers "normal" priority web
        // push under Doze/App Standby — exactly the state a swiped-away
        // PWA's Chrome process sits in — so delivery can be held back
        // indefinitely instead of waking the device to run the SW. 'high'
        // requests immediate best-effort delivery, bypassing that deferral.
        headers: { Urgency: 'high' },
        fcmOptions: { link: data.url || '/app' },
      },
    });

    console.log(`[FCM] Sent ${response.successCount} successes, ${response.failureCount} failures`);

    // Remove tokens that are no longer valid (user uninstalled, revoked permission, etc.)
    const expired = [];
    response.responses.forEach((r, i) => {
      if (!r.success) {
        const code = r.error?.code;
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
        ) {
          expired.push(tokens[i]);
          console.log(`[FCM] Removing expired token: ${tokens[i].substring(0, 20)}...`);
        }
      }
    });

    if (expired.length > 0) {
      await db.query(
        'DELETE FROM onec_fcm_tokens WHERE token = ANY($1)',
        [expired]
      );
      console.log(`[FCM] Cleaned up ${expired.length} expired token(s)`);
    }
  } catch (error) {
    console.error('[FCM] sendPush error:', error.message);
    // Don't throw — push failures shouldn't block the main request
  }
}

module.exports = { sendPush };
