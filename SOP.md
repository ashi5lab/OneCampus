# Standard Operating Procedure (SOP) — OneCampus Agent Sessions

This document exists because the notification feature build (2026-07-27) hit
avoidable mistakes — this is the checklist to stop them from repeating.
**Read this before starting any non-trivial task.** Update it whenever a new
mistake pattern is found — this is a living document, not a one-time write-up.

---

## 0. Before Writing Any Code

1. **Read the root docs first**: `AGENT_LOG.md`, `OneCampus_PRD_v2.md`,
   `Rules.md`, `Future_Features.md` (see Rules.md §5, already a standing rule).
2. **Grep before building.** Before creating a hook, component, or utility,
   search the codebase for one that already does it:
   ```
   grep -rn "usePushNotificationSync\|listenForegroundMessages" client/src
   ```
   *What went wrong:* built a second `usePushNotificationSync` hook and a
   second foreground-toast listener in `DashboardPage.jsx` without checking
   that `client/src/hooks/usePushNotificationSync.jsx` already existed and
   was already mounted globally in `Layout.jsx`. Result: duplicate logic,
   wasted work, and a crash (see §3) that looked like it broke the
   *original* working feature.
3. **Read the actual component signature before using it** — don't assume
   prop names from memory or from a similar-sounding component.
   *What went wrong:* used `<UserSearchSelect isMulti roles={...} />` —
   `UserSearchSelect` is single-select only and has no `isMulti` prop; the
   multi-select variant is a *separate* export, `MultiUserSearchSelect`,
   with a different prop name (`values` not `value`). Always open the
   component file and read its actual parameter list first.

---

## 1. Server Conventions (Express / PostgreSQL)

### 1.1 Response shape
Every existing endpoint in this codebase wraps its payload as `{ data: ... }`:
```js
res.json({ data: result.rows });
```
Client-side `apiClient.post(...).then((res) => res.data)` depends on this.
**If a new endpoint returns anything else** (e.g. `res.json({ ok, sent })`
with no `data` wrapper), every client caller using the `.data` convention
will silently get `undefined` and crash on first property access.
*What went wrong:* `sendAppNotification` returned `{ ok, sent, message }`
directly → client read `res.data.sent` → `Cannot read properties of
undefined`. Fixed by wrapping in `{ data: { ok, sent, message } }`.
**Rule: grep a sibling controller in the same module for `res.json(` before
writing a new endpoint's response shape.**

### 1.2 Auth middleware import
`server/middleware/auth.js` exports the function directly (`module.exports = auth`),
**not** `{ requireAuth }`. Import it as:
```js
const auth = require('../../middleware/auth');
router.use(auth);
```
*What went wrong:* wrote `const { requireAuth } = require('../../middleware/auth')`
→ destructured `undefined` → `router.use(undefined)` → server crashed on boot
with `Router.use() requires a middleware function`.
**Rule: before importing any middleware, open one sibling `routes.js` file
in the same server and copy its exact import line.**

### 1.3 Migrations are NOT auto-applied
Adding a file to `server/migrations/*.sql` does nothing by itself. It must
be run manually per tenant:
```bash
cd server
node scripts/run_migration.js 0XX_your_migration.sql
```
*What went wrong:* wrote `043_add_notifications.sql`, never ran it. Every
`INSERT INTO onec_notifications` then threw "relation does not exist,"
caught silently in a `try/catch` inside the send loop, and the client saw
`"sent": 0` with zero information about why.
**Rule: after creating any migration file, immediately run it against every
tenant (`run_migration.js`) — do not consider the feature "done" until you've
confirmed the table/column exists in the actual DB, e.g.:**
```bash
node -e "require('dotenv').config(); const db=require('./config/db');
db.query('SET search_path TO <tenant_schema>')
  .then(()=>db.query(\"SELECT to_regclass('onec_your_table')\"))
  .then(r=>{console.log(r.rows);process.exit(0)});"
```

### 1.4 Don't let per-item try/catch loops hide the real error
*What went wrong:* `sendAppNotification`'s per-recipient loop caught and
`console.error`'d failures without surfacing them to the client, so a
100%-failure run looked identical (from the client's point of view) to "sent
successfully to 0 people because you selected nobody." Debugging required
finding server-side console logs.
**Rule:** when a batch operation can partially fail, either (a) return the
per-item error detail in the response (`{ data: { sent, failed, errors: [...] } }`),
or (b) at minimum, note in the response when `sent === 0 && attempted > 0`
that something is wrong server-side, not just "0 sent."

---

## 2. Client Conventions (React / Vite)

### 2.1 Async functions inside `useEffect`
Never do:
```js
useEffect(() => {
  return someAsyncFn(callback); // returns a Promise, not a cleanup function!
}, []);
```
React requires the cleanup return value to be a function, not a Promise.
Passing a Promise throws `TypeError: destroy is not a function` and can
crash the whole subtree (no error boundary in this app → the entire React
tree unmounts, silently taking out unrelated globally-mounted hooks like
`Layout.jsx`'s notification listener until the next reload).

**Correct pattern:**
```js
useEffect(() => {
  let unsubscribe = () => {};
  let cancelled = false;

  someAsyncFn(callback).then((fn) => {
    if (cancelled) fn();       // effect already cleaned up before promise resolved
    else unsubscribe = fn;
  });

  return () => {
    cancelled = true;
    unsubscribe();
  };
}, []);
```
`listenForegroundMessages()` in `lib/firebase.js` is async (it awaits
Firebase's `isSupported()` check) — always wrap it this way, never
`return listenForegroundMessages(cb)` directly.

### 2.2 There is no error boundary in this app
An uncaught render/effect error unmounts the **entire** React tree, not just
the offending component — including globally-mounted providers/hooks in
`Layout.jsx` (socket, push sync, sidebar). A bug that looks contained to one
page can silently break app-wide features until the user reloads.
**Rule:** treat any uncaught console error during manual testing as
"something else may also be broken right now" — don't assume the blast
radius is limited to the component that logged the error.

### 2.3 Verify component prop contracts before wiring them up
See §0.3. Also applies to hooks: `useAllUsers()` returns the array directly
(via `useQuery({queryFn: profileApi.listUsers})`), not `{data: [...]}` at
the query-fn level — but the **hook's own** return value is still the
standard React Query object, so callers destructure `const { data: allUsers = [] } = useAllUsers()`.
Don't assume a shape — grep the hook's definition.

### 2.4 Vite HMR error logs can be stale
`read_console_messages` can return buffered errors from *before* your last
edit/reload — a `[hmr] Failed to reload` line with an old `?t=<timestamp>`
query param is history, not a live problem. **Always cross-check with a
direct assertion** (e.g. `document.getElementById('root').children.length`,
or `read_page` showing real content) before concluding a fix didn't work.

---

## 3. Firebase / Push Notification Specifics

### 3.1 VAPID key is required, not optional
`getToken()` silently fails (returns `null`, no thrown error) if
`VITE_FIREBASE_VAPID_KEY` is missing from `client/.env` — even after the
browser grants permission. This looks like "Permission denied by browser"
in the UI when it's actually a missing config value.

### 3.2 Firebase vendor files must be physically present
`client/public/vendor/firebase-app-compat.js` and `firebase-messaging-compat.js`
are generated by `client/scripts/copy-firebase-compat.cjs` (wired to
`postinstall`). If `npm install` was run before this script existed, or
`node_modules` was restored from a cache, the vendor files can be missing
even though the script exists. **Verify with:**
```bash
ls client/public/vendor/
```
If empty, run `node client/scripts/copy-firebase-compat.cjs` manually. A
missing vendor file makes the service worker fail registration with
`ServiceWorker script evaluation failed` — easy to misdiagnose as a VAPID
or permission problem instead.

### 3.3 A Firebase Console "test message" bypasses the entire backend
Sending a test push directly to a copied FCM token via Firebase Console
does **not** touch `createNotification()`, does **not** insert into
`onec_notifications`, and will **never** show up in the Activity/Notifications
page — by design, not by bug. It only proves the client→browser delivery
path works. Use it for delivery-path debugging only; use the in-app
**Broadcast → App Notification** flow (or a real trigger like attendance
marking) to test the full pipeline (DB row + Socket.io + push).

### 3.4 Firebase Console "Reports" tab is not real-time and not authoritative
Programmatic sends via `admin.messaging().sendEachForMulticast()` don't
populate Console campaign analytics the way Console-composed campaigns do.
**Trust server-side logs** (`[FCM] Sent X successes, Y failures`) as the
source of truth for whether a send actually worked, not the Console UI.

### 3.5 One feature, one listener
Do not add a second `onMessage`/foreground-listener registration "to be
safe." Check `client/src/hooks/usePushNotificationSync.jsx` (mounted once,
globally, in `Layout.jsx`) before adding any new foreground-push UI —
this is the single source of truth for: token silent-refresh on load, toast
on foreground push, and real OS-level notification on foreground push.

---

## 4. Verification Checklist (Before Calling Anything "Done")

- [ ] If you added a migration file: **ran it** against the actual tenant DB
      and confirmed the table/column exists (§1.3).
- [ ] If you added/changed a server response shape: confirmed it matches
      the `{ data: ... }` convention, or confirmed the client-side caller
      was updated to match (§1.1).
- [ ] If you added a new client hook/effect touching Firebase, sockets, or
      any app-wide concern: grepped for an existing one first (§0.2, §3.5).
- [ ] If you touched a `useEffect`: confirmed the callback/cleanup return
      value is synchronous, not a Promise (§2.1).
- [ ] Checked the actual browser console (fresh navigation, not stale
      buffered logs — §2.4) and confirmed no *new* uncaught errors.
- [ ] Manually exercised the real user flow the feature is for (not just
      "the page loads") — e.g. actually clicking "Send Notification" and
      checking the result, not just confirming the form renders.
- [ ] Updated `AGENT_LOG.md` with a new entry per Rules.md §5.

---

## 5. When Debugging "It's Not Showing Up"

Work outward from the write path, not the read path:
1. Did the write actually succeed server-side? (Check server console logs,
   not just the client's success/failure toast.)
2. Did it hit the DB table you expect? (Query it directly.)
3. Is there a duplicate/competing implementation that could be intercepting
   or shadowing the one you're testing? (§0.2, §3.5)
4. Only after 1–3 are confirmed clean, look at rendering/display logic.

This order would have caught the `onec_notifications` migration-not-run
bug and the duplicate-hook confusion much faster than starting from "why
isn't the toast showing."
