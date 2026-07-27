# Notification System Implementation Plan — Production Ready

**Status:** Ready for implementation  
**Estimated Effort:** 3–4 weeks  
**Priority:** High — Core feature for user engagement

---

## Phase A: Frontend Enhancements (1 week)

### A1. Broadcast Module: Add "App Notification" Tab

**File:** `client/src/features/broadcast/components/BroadcastPage.jsx`

**Change:**
- Add new tab: "App Notification" alongside "SMS" and "WhatsApp"
- Form fields:
  - **Title** (text input, 50 char limit)
  - **Message** (textarea, 300 char limit)
  - **Recipient(s)** (UserSearchSelect, multiselect, roles: ['learner', 'guardian', 'instructor', 'staff'])
  - **Send** button

**Server Call:**
```js
POST /api/v1/broadcast/app-notification
{
  title: "Attendance Alert",
  body: "Your attendance for today has been marked",
  recipient_ids: [1, 2, 3],  // user_ids
  type: "broadcast"  // notification type
}
```

**Outcome:** 
- Creates row in `onec_notifications` for each recipient
- Sends FCM push to all recipients' tokens
- Real-time Socket.io event updates notification bell

---

### A2. Activity Page: Show Notifications

**File:** `client/src/features/activity/components/ActivityPage.jsx` (or create new)

**Display:**
- **Tab:** "Notifications" (alongside existing activity tabs)
- **List:**
  - Newest first, with relative timestamps (Just now / 2h ago / Yesterday)
  - Unread notifications: bold title, full opacity
  - Read notifications: greyed out title, reduced opacity
  - Left border: colored by type (green=attendance, orange=notice, red=discipline, blue=broadcast, purple=app)
  - Clicking item: marks as read → navigates to `notification.url` if present
- **Filters:** All / Unread / By Type
- **Empty State:** "No notifications yet"

**Query:**
```js
GET /api/v1/notifications?page=1&pageSize=50
```

Returns:
```json
{
  "data": [
    {
      "id": 1,
      "type": "broadcast",
      "title": "Assembly Tomorrow",
      "body": "School assembly will be held at 8 AM",
      "url": "/app/notices",
      "is_read": false,
      "created_at": "2026-07-27T10:30:00Z"
    }
  ],
  "meta": { "total": 25, "page": 1, "totalPages": 2 }
}
```

---

### A3. Home Page: Toast Notification on Message Arrival

**File:** `client/src/features/home/components/HomePage.jsx`

**Implementation:**
1. Add hook to listen for foreground messages:
```js
import { listenForegroundMessages } from '../../../lib/firebase';
import { useToast } from '../../../hooks/useToast';  // or your toast library

useEffect(() => {
  const unsubscribe = listenForegroundMessages((payload) => {
    showToast({
      title: payload.notification?.title,
      description: payload.notification?.body,
      duration: 5000,
      onClose: () => {
        if (payload.data?.url) navigate(payload.data.url);
      }
    });
  });
  return unsubscribe;
}, []);
```

**Toast Features:**
- Title + body text
- Auto-dismiss after 5 seconds
- Click to navigate to `notification.url` (if present)
- Close button (× icon, top-right)
- Appear at top of page, non-blocking
- Slide in animation, slide out on dismiss

**Styling:** Use existing toast component (check if `useToast` or Sonner exists in project)

---

## Phase B: Backend Implementation (1 week)

### B1. Firebase Admin Setup

**Status:** Already done in notification_plan.md Phase 1

**Check:**
```bash
# Verify in server/.env
echo $FIREBASE_PROJECT_ID
echo $FIREBASE_CLIENT_EMAIL
echo $FIREBASE_PRIVATE_KEY
```

**If not done:**
1. `npm install firebase-admin` in server/
2. Add env vars (see notification_plan.md Step 1.2)
3. Create `server/lib/firebase.js` (see notification_plan.md Step 1.3)
4. Create `server/lib/sendPush.js` (see notification_plan.md Step 1.4)

---

### B2. Notification Endpoints

**Status:** Partially done (in notification_plan.md Phase 2.2)

**Ensure these exist:**
```
GET  /api/v1/notifications
GET  /api/v1/notifications/unread-count
PATCH /api/v1/notifications/:id/read
PATCH /api/v1/notifications/read-all
POST /api/v1/broadcast/app-notification  ← NEW
```

**Create:** `server/modules/broadcast/app-notification-controller.js`
```js
async function sendAppNotification(req, res) {
  const { title, body, recipient_ids } = req.body;
  
  // Validate permission: only admins can send broadcast
  if (!req.can('broadcast.send')) return res.status(403).json({ error: 'Forbidden' });
  
  // Send to each recipient
  for (const userId of recipient_ids) {
    await createNotification(req.db, req.io, userId, {
      type: 'broadcast',
      title,
      body,
      url: null,  // or specify a URL
      data: {}
    });
  }
  
  res.json({ ok: true, sent: recipient_ids.length });
}
```

---

### B3. Socket.io User Rooms (Real-time Updates)

**Status:** Needs implementation

**Location:** `server/index.js` (Socket.io initialization)

```js
io.on('connection', (socket) => {
  const userId = socket.handshake.auth?.userId;
  
  if (userId) {
    // Join private room so server can push events to this user only
    socket.join(`user:${userId}`);
    console.log(`User ${userId} connected via socket`);
  }
  
  socket.on('disconnect', () => {
    console.log(`User ${userId} disconnected`);
  });
});
```

**Client:** Pass `userId` when connecting in `useSocket()` hook
```js
const socket = io(API_URL, {
  auth: { userId: currentUser.id }
});
```

**Server emits (after createNotification):**
```js
io.to(`user:${userId}`).emit('notification:new', notification);
```

---

## Phase C: Permission & Token Management (1 week)

### C1. Default Permission Request (Not Mandatory)

**Current:** Users must go to Settings → enable manually  
**New:** Ask on first login (Dashboard) with soft prompt

**File:** `client/src/components/PushPermissionPrompt.jsx` (NEW)

**Logic:**
- Show on Dashboard mount if:
  - `Notification.permission !== 'granted'`
  - `localStorage.getItem('fcm_prompt_asked') === null`
  - AND user hasn't dismissed in last 3 days
- Button options: "Enable" / "Ask Later" / "Don't Ask Again"
- "Ask Later" → sets localStorage key with 3-day expiry
- "Don't Ask Again" → sets permanent flag in DB (`onec_users.fcm_permission_asked = true`)

**DB Migration:** `server/migrations/0XX_add_fcm_fields_to_users.sql`
```sql
ALTER TABLE onec_users
  ADD COLUMN fcm_permission_asked BOOLEAN DEFAULT FALSE,
  ADD COLUMN fcm_permission_date TIMESTAMPTZ;
```

---

### C2. Automatic Token Refresh & Persistence

**Current:** Token refreshed silently on app load via `getExistingPushToken()`  
**Enhancement:** Track token rotation and re-save if changed

**File:** `client/src/features/profile/hooks/usePushNotificationSync.jsx`

```js
export function usePushNotificationSync() {
  useEffect(() => {
    // On app load, silently refresh token if permission previously granted
    getExistingPushToken(import.meta.env.VITE_FIREBASE_VAPID_KEY)
      .then(async (token) => {
        if (token) {
          // Check if token changed (Firebase rotated it)
          const localToken = localStorage.getItem('fcm_token');
          if (token !== localToken) {
            // Token rotated → save to DB and localStorage
            await saveFcmToken({ token, device_info: navigator.userAgent });
            localStorage.setItem('fcm_token', token);
            console.log('[FCM] Token refreshed after rotation');
          }
        }
      });
  }, []);
}
```

**Call this from:** App.jsx main useEffect (runs once on mount)

---

### C3. FCM Token Behavior & Lifecycle

**Question:** Does FCM token change each time user opens app?

**Answer:** **No, typically not.** Tokens are stable within a device/browser.

| Scenario | Token Changes? | Details |
|---|---|---|
| Same browser, reload page | ❌ No | Token persists in browser storage |
| Same device, different browser | ✅ Yes | Each browser gets its own FCM token |
| Browser cache cleared | ✅ Yes | Firebase regenerates on `getToken()` |
| Uninstall/reinstall app (mobile) | ✅ Yes | New install = new token |
| Locale change (system) | ⚠️ Rarely | FCM may rotate token as security measure |
| Security incident (FCM detected) | ✅ Yes | Firebase invalidates and rotates token |
| Firebase SDK update | ⚠️ Rarely | Usually transparent, token stays |

**Your app handles this correctly:**
- `getExistingPushToken()` runs on app load
- If token changed → saves new one to DB and localStorage
- Expired tokens auto-delete from DB (via `sendPush()` error handling)

---

## Phase D: Mobile App (Future, 2+ weeks)

### D1. Android & iOS with Capacitor (Recommended)

**Once you're ready for native apps:**

```bash
cd client
npm install @capacitor/core @capacitor/cli @capacitor/push-notifications
npx cap init "OneCampus" "com.onecampus.app" --web-dir=dist
npx cap add android
npx cap add ios
```

**Shared Firebase Project:** Same `onecampus-edu` — no new config needed

**DB Enhancement:** Add `device_type` column
```sql
ALTER TABLE onec_fcm_tokens
  ADD COLUMN device_type VARCHAR(20) DEFAULT 'web';  -- 'web' | 'android' | 'ios'
```

**Token registration (in React):**
```js
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

if (Capacitor.isNativePlatform()) {
  await PushNotifications.register();
  PushNotifications.addListener('registration', ({ value: token }) => {
    // Same endpoint, same DB table, same FCM project
    saveFcmToken({ token, device_info: Capacitor.getPlatform() });
  });
} else {
  // Web flow (existing code)
  await requestPushPermission(...);
}
```

**Why this works:**
- Same `onec_fcm_tokens` table holds web + mobile tokens
- `sendPush()` sends to all tokens for a user (Firebase routes each to correct channel)
- No backend changes needed — all platforms use the same infrastructure

---

## Phase E: Production Checklist

### E1. Before Going Live

- [ ] Firebase service account credentials in server `.env`
- [ ] VAPID key in `client/.env` (already done)
- [ ] `firebase-admin` installed and tested
- [ ] All notification endpoints working (test with curl/Postman)
- [ ] Socket.io user rooms configured
- [ ] `onec_notifications` table migrated on production DB
- [ ] `onec_fcm_tokens` table verified on production DB
- [ ] Broadcast "App Notification" tab working
- [ ] Activity page showing notifications
- [ ] Toast on foreground message working
- [ ] Permission prompt tested (soft banner works without forcing)
- [ ] Send test message to production FCM token successfully

### E2. Monitoring & Maintenance

**Track:**
- Failed push deliveries (invalid/expired tokens in logs)
- Token rotation rate (check DB for duplicates/old tokens)
- Notification latency (time from send → receipt)
- User engagement (click-through on notifications)

**Cleanup Script** (run weekly via cron):
```sql
-- Delete tokens not used in 60 days
DELETE FROM onec_fcm_tokens 
WHERE DATE(last_used_at) < NOW() - INTERVAL '60 days';
```

---

## Phase F: User Adoption Strategy

### F1. Gradual Rollout

**Week 1:** Test with staff only
- Enable in server config: `ENABLE_NOTIFICATIONS=true` only for role 'staff'
- Gather feedback

**Week 2-3:** Enable for instructors
- Add role 'instructor' to config
- Train instructors on broadcast feature

**Week 4:** Full rollout to all users
- Show soft permission prompt on Dashboard
- Add in-app help text

### F2. Engagement

**Send notifications for:**
- Attendance marked (immediate)
- New notice published (immediate)
- Discipline record logged (to guardian, immediate)
- Assignment posted (to cohort, immediate)
- Fee reminder (scheduled, weekly)
- Exam result published (immediate)
- Custom broadcast by admin (manual)

---

## Summary: Next Steps

### Immediate (Today)
1. ✅ VAPID key configured
2. ✅ Test single message working

### This Week
- [ ] Implement A1: Broadcast "App Notification" tab
- [ ] Implement A2: Activity "Notifications" page
- [ ] Implement A3: Home page toast listener

### Next Week
- [ ] Verify all B1-B3 backend endpoints exist and work
- [ ] Implement C1: Permission prompt on Dashboard
- [ ] Implement C2: Token refresh hook

### Before Production
- [ ] Server setup: firebase-admin, service account in .env
- [ ] Database: Run migration for `onec_fcm_tokens` device_type column
- [ ] Testing: Send 50 test notifications, verify all states
- [ ] Documentation: Update Rules.md and OneCampus_PRD_v2.md

### Future (Mobile)
- Plan native app with Capacitor (2+ weeks)
- Reuse all backend code, same Firebase project
- Same `onec_fcm_tokens` table for all platforms

---

**Questions?** Let me know which phase to start with!
