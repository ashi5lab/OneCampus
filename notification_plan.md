# Firebase Notification Plan — OneCampus

End-to-end implementation plan for in-app notifications + web push (FCM) for PWA and browser, with a future path to native Android and iOS.

---

## Current State

### Already in the codebase

| What | Where |
|---|---|
| Firebase SDK v12 installed client-side | `firebase ^12.16.0` in `client/package.json` |
| Background SW handler | `client/public/firebase-messaging-sw.js` |
| `requestPushPermission()` + `onMessage()` | `client/src/lib/firebase.js` |
| FCM tokens table | migration 038 — `onec_fcm_tokens` |
| Token save endpoint | `POST /profile/fcm-token` |
| Profile page calls permission + saves token | `ProfilePage.jsx` ~line 260 |
| `NotificationBell` UI component | `client/src/components/NotificationBell.jsx` |
| Socket.io on both client and server | `socket.io ^4.8.3` |
| `vite-plugin-pwa` configured | `registerType: autoUpdate`, manifest baked in |

### Still needed

| What | Why it matters |
|---|---|
| `firebase-admin` not installed on server | Server cannot send any push yet |
| No server Firebase service account | No `FIREBASE_*` env vars defined |
| No `onec_notifications` table | No DB storage for in-app notifications |
| No notification server module | No list / read / create endpoints |
| `NotificationBell` not wired to real data | Shows message counts, not notifications |
| No `sendPush()` utility | No mechanism to trigger FCM from events |
| No event triggers | Attendance, notices, discipline fire nothing |
| Permission request only from Profile page | Most users never see it |

> **Note on Firebase client config security:** `apiKey`, `appId`, `messagingSenderId` etc. are **public project identifiers** — they are safe to hardcode and this is standard Firebase practice. The only values that must stay in env vars are the server-side **service account credentials** (private key). The current VAPID key in `ProfilePage.jsx` can optionally move to `VITE_FIREBASE_VAPID_KEY` for cleanliness but is not a security issue.

---

## Phase 1 — Foundations (1–2 days)

Install `firebase-admin` on the server, wire up the service account, and verify the existing SW handler works end-to-end.

### Step 1.1 — Install firebase-admin

```bash
cd server
npm install firebase-admin
```

### Step 1.2 — Get the service account key from Firebase Console

Project Settings → Service Accounts → **Generate new private key**. Download the JSON. **Never commit this file.** Extract the three values into your server `.env`:

```env
# server/.env  (add to server/.env.example with blank values)
FIREBASE_PROJECT_ID=onecampus-edu
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@onecampus-edu.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

### Step 1.3 — Create `server/lib/firebase.js`

Initialise the admin SDK once at startup. The `\n` replacement is required because `.env` files store the private key with literal `\n` escape sequences.

```js
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

module.exports = admin;
```

### Step 1.4 — Create `server/lib/sendPush.js`

The universal push utility. Looks up all FCM tokens for a user, sends a multicast message, and auto-removes expired or invalid tokens.

```js
const admin = require('./firebase');

// db = req.db (tenant pool). userId = onec_users.id.
async function sendPush(db, userId, { title, body, data = {} }) {
  const tokensResult = await db.query(
    'SELECT id, token FROM onec_fcm_tokens WHERE user_id = $1',
    [userId]
  );
  if (tokensResult.rows.length === 0) return;

  const tokens = tokensResult.rows.map(r => r.token);

  const response = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    webpush: {
      fcmOptions: { link: data.url || '/app' },
    },
  });

  // Remove tokens that are no longer valid
  const expired = [];
  response.responses.forEach((r, i) => {
    if (!r.success) {
      const code = r.error?.code;
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        expired.push(tokens[i]);
      }
    }
  });

  if (expired.length > 0) {
    await db.query(
      'DELETE FROM onec_fcm_tokens WHERE token = ANY($1)',
      [expired]
    );
  }
}

module.exports = { sendPush };
```

### Step 1.5 — Verify `firebase-messaging-sw.js` (no changes needed)

`client/public/firebase-messaging-sw.js` already exists and is correct. Vite copies `public/` files as-is to the build root. It coexists with `vite-plugin-pwa`'s generated `sw.js` — there is no conflict. Firebase requires the SW to be named exactly `firebase-messaging-sw.js` and it handles background push independently.

**Test:** Firebase Console → Cloud Messaging → Send test message → paste a token from `onec_fcm_tokens`.

### Step 1.6 — Move VAPID key to env var (optional clean-up)

```env
# client/.env
VITE_FIREBASE_VAPID_KEY=BAULLVjzW1Q_...
```

```js
// ProfilePage.jsx — replace hardcoded string with:
await requestPushPermission(import.meta.env.VITE_FIREBASE_VAPID_KEY);
```

---

## Phase 2 — In-App Notification Center (2–3 days)

A persistent notification feed inside the app — separate from push. Users see all notifications whether or not they have push enabled. The `NotificationBell` badge updates in real time via Socket.io.

### Step 2.1 — DB migration: `onec_notifications`

```sql
-- server/migrations/039_notifications.sql
CREATE TABLE onec_notifications (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES onec_users(id) ON DELETE CASCADE,
  type        VARCHAR(60) NOT NULL,  -- 'attendance' | 'notice' | 'discipline' | 'broadcast' | 'assignment'
  title       VARCHAR(255) NOT NULL,
  body        TEXT,
  url         VARCHAR(500),          -- deep link, e.g. /app/attendance
  data        JSONB,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON onec_notifications (user_id, is_read, created_at DESC);
CREATE INDEX ON onec_notifications (user_id, created_at DESC);
```

### Step 2.2 — Server notification module

Create `server/modules/notifications/controller.js` with three public endpoints and one internal helper used by all other modules.

```js
const { sendPush } = require('../../lib/sendPush');

// Internal helper — call this from any module (attendance, notices, discipline, etc.)
async function createNotification(db, io, userId, { type, title, body, url, data }) {
  const result = await db.query(
    `INSERT INTO onec_notifications (user_id, type, title, body, url, data)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [userId, type, title, body, url, data ? JSON.stringify(data) : null]
  );
  const notification = result.rows[0];

  // Real-time: emit to the user's private Socket.io room
  io?.to(`user:${userId}`).emit('notification:new', notification);

  // Push: fire-and-forget, don't block the response
  sendPush(db, userId, { title, body, data: { url: url || '/app' } }).catch(() => {});

  return notification;
}

// GET /notifications?page&pageSize
async function list(req, res) {
  const page     = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(50, parseInt(req.query.pageSize) || 20);
  const offset   = (page - 1) * pageSize;

  const [countRes, dataRes] = await Promise.all([
    req.db.query(
      'SELECT COUNT(*) FROM onec_notifications WHERE user_id = $1',
      [req.user.userId]
    ),
    req.db.query(
      `SELECT * FROM onec_notifications WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.userId, pageSize, offset]
    ),
  ]);

  const total = parseInt(countRes.rows[0].count, 10);
  res.json({
    data: dataRes.rows,
    meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  });
}

// GET /notifications/unread-count
async function unreadCount(req, res) {
  const result = await req.db.query(
    'SELECT COUNT(*) FROM onec_notifications WHERE user_id = $1 AND is_read = FALSE',
    [req.user.userId]
  );
  res.json({ count: parseInt(result.rows[0].count, 10) });
}

// PATCH /notifications/:id/read
async function markRead(req, res) {
  await req.db.query(
    'UPDATE onec_notifications SET is_read = TRUE, read_at = NOW() WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.userId]
  );
  res.json({ ok: true });
}

// PATCH /notifications/read-all
async function markAllRead(req, res) {
  await req.db.query(
    'UPDATE onec_notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = $1 AND is_read = FALSE',
    [req.user.userId]
  );
  res.json({ ok: true });
}

module.exports = { createNotification, list, unreadCount, markRead, markAllRead };
```

Routes (`server/modules/notifications/routes.js`):

```js
const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../../middleware/auth');
const controller = require('./controller');

router.use(requireAuth);
router.get('/',             controller.list);
router.get('/unread-count', controller.unreadCount);
router.patch('/:id/read',   controller.markRead);
router.patch('/read-all',   controller.markAllRead);

module.exports = router;
```

Register in `server/index.js`:

```js
app.use('/api/v1/notifications', require('./modules/notifications/routes'));
```

### Step 2.3 — Socket.io user rooms

Each authenticated socket joins a private room on connect so the server can push events to a specific user without broadcasting.

```js
// In your Socket.io init block
io.on('connection', (socket) => {
  const userId = socket.handshake.auth?.userId;
  if (userId) socket.join(`user:${userId}`);
});
```

The client should pass `userId` when connecting:

```js
// Wherever the socket is initialised on the client
const socket = io(API_URL, {
  auth: { userId: currentUser.id },
});
```

### Step 2.4 — Wire `NotificationBell` to real data

Create `client/src/features/notifications/hooks/useNotifications.js`:

```js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useSocket } from '../../../lib/socket';
import { apiClient } from '../../../lib/apiClient';

export function useUnreadCount() {
  const qc     = useQueryClient();
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;
    const handler = () => qc.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    socket.on('notification:new', handler);
    return () => socket.off('notification:new', handler);
  }, [socket, qc]);

  return useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => apiClient.get('/notifications/unread-count').then(r => r.data.count),
    staleTime: 30_000,
  });
}

export function useNotifications(page = 1) {
  return useQuery({
    queryKey: ['notifications', 'list', page],
    queryFn: () =>
      apiClient.get(`/notifications?page=${page}&pageSize=20`).then(r => r.data),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.patch('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
```

### Step 2.5 — Notification panel / drawer

When the bell is tapped, show a slide-in panel with:
- Notifications listed newest first
- Icon by type (attendance, notice, discipline, etc.)
- Bold title + dimmed body when unread, greyed when read
- Relative timestamp
- "Mark all read" button top-right
- Clicking an item → marks read → navigates to `notification.url`
- Empty state: "You're all caught up."

---

## Phase 3 — Push Notification Triggers (2–3 days)

Wire `createNotification()` into existing server events. Each call handles in-app storage, Socket.io delivery, and FCM push in one line.

### Usage pattern

```js
const { createNotification } = require('../../modules/notifications/controller');

// Inside any existing controller, after a successful DB write:
await createNotification(req.db, req.io, targetUserId, {
  type:  'attendance',
  title: 'Attendance marked',
  body:  'Your attendance for today has been recorded.',
  url:   '/app/attendance',
});
```

### Trigger points

| Event | Notify | Server file |
|---|---|---|
| Attendance bulk saved | Learner + linked guardians | `modules/attendance/controller.js` — bulk handler |
| New notice published | All users (or scoped audience) | `modules/notices/controller.js` — `create()` |
| Discipline record logged | Learner + linked guardians | `modules/discipline/controller.js` — `create()` |
| Broadcast sent | Target audience | `modules/broadcast/controller.js` |
| New message received | Recipient | `modules/messages/controller.js` |
| Assignment posted | Learners in cohort | `modules/assignments/controller.js` — `create()` |
| Exam result published | Learner + linked guardians | `modules/exams/controller.js` — `publish()` |

> **Notifying multiple users at once** (e.g. all learners in a cohort): loop `createNotification()` in a `Promise.all()`, or extract a batch helper that bulk-inserts rows and sends one multicast FCM message (more efficient for 100+ tokens).

---

## Phase 4 — PWA Polish (1 day)

### Step 4.1 — Permission onboarding banner

Currently the push permission request only appears on the Profile page — most users never see it. Move it to a soft prompt on the Dashboard after first login: a non-blocking banner "Get notified about attendance and notices" with **Accept / Later** buttons. "Later" stores a flag in `localStorage` and retries after 3 days.

File: `client/src/components/PushPromptBanner.jsx`

### Step 4.2 — PWA install prompt

Capture `beforeinstallprompt` early (Chrome / Edge / Android) and show a bottom sheet "Add OneCampus to your home screen".

```js
// App.jsx — capture before any user gesture
useEffect(() => {
  const handler = (e) => { e.preventDefault(); window.__installPrompt = e; };
  window.addEventListener('beforeinstallprompt', handler);
  return () => window.removeEventListener('beforeinstallprompt', handler);
}, []);
```

File: `client/src/components/InstallPrompt.jsx`

### Step 4.3 — Per-type notification preferences

Add a **Notifications** tab to Settings. Let users toggle notification types: Attendance, Notices, Messages, Discipline, Assignments. Store preferences in a new `onec_notification_prefs` table. The `createNotification()` helper checks the preference before sending push (still saves the in-app record regardless).

```sql
-- server/migrations/040_notification_prefs.sql
CREATE TABLE onec_notification_prefs (
  user_id     INT PRIMARY KEY REFERENCES onec_users(id) ON DELETE CASCADE,
  attendance  BOOLEAN NOT NULL DEFAULT TRUE,
  notices     BOOLEAN NOT NULL DEFAULT TRUE,
  messages    BOOLEAN NOT NULL DEFAULT TRUE,
  discipline  BOOLEAN NOT NULL DEFAULT TRUE,
  assignments BOOLEAN NOT NULL DEFAULT TRUE
);
```

---

## Phase 5 — Native Android & iOS (Future)

Both options reuse the **same Firebase project** and the **same `onec_fcm_tokens` table** — no backend changes required.

### Option A — Capacitor (Recommended)

Wraps the existing React app in a native WebView shell. Fastest path — 100% code reuse, same build pipeline, same Firebase project.

```bash
# Install Capacitor in the React project
cd client
npm install @capacitor/core @capacitor/cli @capacitor/push-notifications

# Init
npx cap init "OneCampus" "com.onecampus.app" --web-dir=dist

# Add platforms
npx cap add android
npx cap add ios

# Build and sync
npm run build
npx cap sync

# Open in native IDEs
npx cap open android   # Android Studio
npx cap open ios       # Xcode
```

In Android Studio: add `google-services.json` (download from Firebase Console → Project Settings → Android app).  
In Xcode: add push notification capability + add `GoogleService-Info.plist`.

Register for push in the React app (detect native platform and use Capacitor plugin instead of the web SDK):

```js
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  await PushNotifications.requestPermissions();
  await PushNotifications.register();
  PushNotifications.addListener('registration', ({ value: token }) => {
    // Same endpoint the web version uses
    profileApi.saveFcmToken(token, 'native');
  });
} else {
  // Existing web push flow
  await requestPushPermission(import.meta.env.VITE_FIREBASE_VAPID_KEY);
}
```

Publish to **Google Play Store** (Android Studio → Build → Generate Signed Bundle) and **Apple App Store** (Xcode → Product → Archive → Distribute App).

> **iOS APNs requirement:** In the Firebase Console under Project Settings → Cloud Messaging → Apple app configuration, upload your APNs Authentication Key (Apple Developer → Certificates, Identifiers & Profiles → Keys). Without this, FCM cannot deliver to iOS devices.

### Option B — React Native (Alternative)

Separate native codebase using `@react-native-firebase/messaging`. More native feel and performance, but doubles maintenance burden — two codebases for one product. Best chosen only if you need platform-specific UI that a PWA/Capacitor WebView cannot match.

| | Capacitor | React Native |
|---|---|---|
| Code reuse | 100% of existing React | API/hooks only, UI rebuilt |
| Time to first build | 1–2 days | 1–2 weeks |
| Maintenance | One codebase | Two codebases |
| Performance | Near-native | Native |
| Push notifications | `@capacitor/push-notifications` | `@react-native-firebase/messaging` |
| Recommendation | **Start here** | If PWA limitations become blockers |

> **No backend changes for either approach.** The `onec_fcm_tokens.device_info` column can store `'web'` / `'android'` / `'ios'` as a label. The `sendPush()` utility already sends to all tokens for a user regardless of platform — FCM routes each token to the correct channel (Web Push or APNs) automatically.

---

## Implementation Timeline

| Phase | Work | Estimate |
|---|---|---|
| 1 — Foundations | `firebase-admin`, service account, `sendPush()` | 1–2 days |
| 2 — In-App Center | DB migration, notification module, Socket.io rooms, `NotificationBell` wired | 2–3 days |
| 3 — Push Triggers | Wire `createNotification()` into all event points | 2–3 days |
| 4 — PWA Polish | Permission onboarding, install prompt, notification prefs | 1 day |
| **Total (web + PWA)** | | **6–9 days** |
| 5 — Native (Capacitor) | Capacitor setup, platform builds, store submission | 1–2 weeks |

> **Phases 1 and 2 can partially run in parallel.** Phase 2's DB migration and Socket.io room setup do not depend on `firebase-admin`. The `sendPush()` call inside `createNotification()` is fire-and-forget, so push failing silently will not break in-app delivery while Phase 1 is still being set up.
